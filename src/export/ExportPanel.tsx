"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate";
import { Badge, Button, Card, Section } from "../ui/components";
import { cx, mutedClass } from "../ui/styles";
import { getExportPlan, listExportMedia, readExportTable, signExportMedia } from "./actions";

const LAST_KEY = "core_last_export_time";
/** Ohne Streaming in eine Datei liegt alles im Arbeitsspeicher des Browsers. */
const MEMORY_LIMIT = 1.5 * 1024 ** 3;

interface Plan {
  tables: { name: string; count: number | null }[];
  mediaCount: number;
  mediaBytes: number;
}

type FileSystemWindow = Window & {
  showSaveFilePicker?: (o: { suggestedName: string; types?: unknown[] }) => Promise<{
    createWritable: () => Promise<{ write: (c: Uint8Array) => Promise<void>; close: () => Promise<void> }>;
  }>;
};

const formatBytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function readWholeTable(table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; ) {
    const res = await readExportTable(table, offset);
    if (!res.ok) throw new Error(`${table}: ${res.error}`);
    rows.push(...res.rows);
    offset += res.rows.length;
    if (res.done) return rows;
  }
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col gap-1.5">
        <span className={mutedClass}>{label}</span>
        <span className="text-[16px] font-semibold text-[#0F172A]">{children}</span>
      </div>
    </Card>
  );
}

/** Daten-Export als Bereich der Einstellungen (Tab im Projekt, siehe README). */
export default function ExportPanel() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [withMedia, setWithMedia] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [tableBusy, setTableBusy] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLast(localStorage.getItem(LAST_KEY));
    } catch {
      // Speicher nicht verfügbar
    }
    getExportPlan().then((res) => (res.ok ? setPlan(res) : setLoadError(res.error)));
  }, []);

  const today = () => new Date().toISOString().slice(0, 10);

  async function exportTable(name: string) {
    setTableBusy(name);
    try {
      const rows = await readWholeTable(name);
      downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), `${name}_${today()}.json`);
      toast.success(`Tabelle „${name}“ exportiert`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export fehlgeschlagen.");
    } finally {
      setTableBusy(null);
    }
  }

  async function exportAll() {
    if (!plan) return;
    const fileName = `website-export_${today()}.zip`;
    const picker = (window as FileSystemWindow).showSaveFilePicker;
    const mediaBytes = withMedia ? plan.mediaBytes : 0;

    if (!picker && mediaBytes > MEMORY_LIMIT) {
      toast.error("Die Medien sind zu groß für diesen Browser. Bitte Chrome oder Edge verwenden oder den Export ohne Medien starten.");
      return;
    }

    setBusy(true);
    try {
      // Ziel: direkt in eine Datei schreiben (Chrome/Edge), sonst im Arbeitsspeicher sammeln
      const chunks: Uint8Array[] = [];
      const writable = picker
        ? await (await picker.call(window, { suggestedName: fileName, types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }] })).createWritable()
        : null;

      let writeChain: Promise<void> = Promise.resolve();
      let failure: Error | null = null;
      let finished!: () => void;
      const done = new Promise<void>((resolve) => (finished = resolve));
      const zip = new Zip((err, chunk, final) => {
        if (err) failure = err;
        else if (writable) {
          const w = writable;
          writeChain = writeChain.then(() => w.write(chunk));
        } else chunks.push(chunk);
        if (final || err) finished();
      });

      const addText = (name: string, text: string) => {
        const f = new ZipDeflate(name, { level: 6 });
        zip.add(f);
        f.push(strToU8(text), true);
      };

      let index = 0;
      for (const t of plan.tables) {
        setProgress(`Tabelle ${++index} von ${plan.tables.length}: ${t.name}`);
        addText(`daten/${t.name}.json`, JSON.stringify(await readWholeTable(t.name), null, 2));
      }

      let mediaWritten = 0;
      const missing: string[] = [];
      if (withMedia) {
        const listed = await listExportMedia();
        if (!listed.ok) throw new Error(listed.error);
        const files = listed.files;
        for (let i = 0; i < files.length; i += 100) {
          const batch = files.slice(i, i + 100);
          const signed = await signExportMedia(batch);
          if (!signed.ok) throw new Error(signed.error);
          for (const file of batch) {
            mediaWritten++;
            setProgress(`Medien ${mediaWritten} von ${files.length}`);
            const url = signed.urls[`${file.bucket}/${file.path}`];
            const safe = (s: string) => s.split(/[\\/]+/).filter((p) => p && p !== "." && p !== "..").join("/");
            const target = `medien/${safe(file.bucket)}/${safe(file.path)}`;
            try {
              if (!url) throw new Error("keine Adresse");
              const res = await fetch(url);
              if (!res.ok || !res.body) throw new Error(`Status ${res.status}`);
              // Bilder, Videos und PDFs sind schon komprimiert
              const entry = new ZipPassThrough(target);
              zip.add(entry);
              const reader = res.body.getReader();
              for (;;) {
                const { value, done: end } = await reader.read();
                if (end) break;
                entry.push(value);
              }
              entry.push(new Uint8Array(0), true);
            } catch {
              missing.push(`${file.bucket}/${file.path}`);
            }
          }
          // Signierte Adressen gelten 1 Stunde, jeder Block wird sofort verarbeitet
        }
      }

      addText(
        "LIES-MICH.txt",
        [
          "Export deiner Website",
          `Erstellt am ${new Date().toLocaleString("de-DE")}`,
          "",
          "daten/   Alle Inhalte aus der Datenbank, eine JSON-Datei pro Tabelle (Zugangsdaten für E-Mail-Versand sind nie enthalten).",
          withMedia ? "medien/  Alle hochgeladenen Dateien, sortiert nach Speicherbereich und Ordner." : "medien/  Nicht enthalten (Export ohne Medien).",
          missing.length ? `\nNicht herunterladbar (${missing.length}):\n${missing.join("\n")}` : "",
        ].join("\n")
      );

      zip.end();
      await done;
      if (failure) throw failure;
      if (writable) {
        await writeChain;
        await writable.close();
      } else {
        downloadBlob(new Blob(chunks as BlobPart[], { type: "application/zip" }), fileName);
      }

      const now = new Date().toLocaleString("de-DE");
      setLast(now);
      try {
        localStorage.setItem(LAST_KEY, now);
      } catch {
        // Speicher nicht verfügbar
      }
      toast.success(missing.length ? `Export fertig, ${missing.length} Datei(en) fehlen (siehe LIES-MICH.txt)` : "Export heruntergeladen");
    } catch (e) {
      // Abbruch im Speichern-Dialog ist kein Fehler
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error(e instanceof Error ? e.message : "Export fehlgeschlagen.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[14px] text-[#334155]">Alle Inhalte und Medien der Website als ZIP-Datei herunterladen.</p>
        <Button variant="primary" onClick={exportAll} disabled={busy || !plan}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} strokeWidth={1.75} aria-hidden="true" />}
          {busy ? "Wird erstellt …" : "Komplett-Export herunterladen"}
        </Button>
      </div>

      {loadError && <p className="text-[14px] text-[#B91C1C]">{loadError}</p>}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Stat label="Zustand">{loadError ? <Badge tone="red" dot>Fehler</Badge> : <Badge tone="green" dot>{plan ? "Bereit" : "Wird geprüft …"}</Badge>}</Stat>
        <Stat label="Letzter Export">{last || "Noch kein Export"}</Stat>
        <Stat label="Medien">{plan ? `${plan.mediaCount} Dateien, ${formatBytes(plan.mediaBytes)}` : "…"}</Stat>
      </div>

      <label className="mt-4 flex items-center gap-2 text-[14px] text-[#0F172A]">
        <input type="checkbox" checked={withMedia} onChange={(e) => setWithMedia(e.target.checked)} disabled={busy} />
        Medien (Bilder, Dokumente) in den Export aufnehmen
      </label>
      {busy && progress && <p className={cx(mutedClass, "mt-2")}>{progress} – bitte dieses Fenster geöffnet lassen.</p>}

      <div>
        <Section title="Einzelne Tabellen" description="Alle Tabellen werden automatisch erkannt, auch neue. Für gezielte Sicherungen einzeln als JSON." bare>
          <Card padded={false}>
            <ul className="divide-y divide-[#F1F5F9]">
              {(plan?.tables ?? []).map((t) => (
                <li key={t.name} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <code className="font-mono text-[13px] text-[#0F172A]">{t.name}</code>
                    <span className={cx(mutedClass, "block")}>{t.count === null ? "" : `${t.count} Einträge`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportTable(t.name)}
                    disabled={tableBusy === t.name || busy}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-50"
                    aria-label={`${t.name} als JSON herunterladen`}
                    title="Als JSON herunterladen"
                  >
                    {tableBusy === t.name ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={1.75} />}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </>
  );
}
