"use client";

// Aktionsleiste der Mehrfachbearbeitung: erscheint unten, sobald Einträge
// ausgewählt sind. „Bearbeiten“ öffnet die Liste der freigegebenen Felder,
// danach ein Fenster mit Art der Änderung, Eingabefeld und Zusammenfassung.

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, PencilLine, Trash2, X } from "lucide-react";
import { AffixInput, Button, Field, Input, Segmented, Select, Textarea } from "../ui/components";
import { Menu } from "../ui/Menu";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cx, hintClass, inputClass, mutedClass } from "../ui/styles";
import ImageUpload from "../media/ImageUpload";
import type { BulkAction, BulkClientConfig, BulkClientField, BulkOp } from "./types";
import type { BulkSelection } from "./useBulkSelection";

export type BulkCustomEditor = (props: { value: unknown; onChange: (value: unknown) => void; field: BulkClientField }) => ReactNode;

const OP_LABELS: Record<BulkOp, string> = {
  set: "Setzen",
  clear: "Leeren",
  add: "Hinzufügen",
  remove: "Entfernen",
  increase: "Erhöhen um",
  decrease: "Senken um",
  percent: "Ändern um %",
};

function opLabel(field: BulkClientField, op: BulkOp) {
  if (field.type === "multiselect" || field.type === "relation") {
    if (op === "set") return "Ersetzen";
    if (op === "clear") return "Alle entfernen";
  }
  return OP_LABELS[op];
}

function initialValue(field: BulkClientField, op: BulkOp): unknown {
  if (field.type === "boolean") return true;
  if (field.type === "multiselect" || field.type === "relation") return [];
  if (field.type === "color") return "#000000";
  if (field.type === "number" || op === "percent") return "";
  return "";
}

/** Text der Zusammenfassung, z. B. „„Marke“ für 8 Produkte auf „Hülsta“ setzen.“ */
function describe(field: BulkClientField, op: BulkOp, value: unknown, countText: string): string {
  const name = (v: unknown) => field.options?.find((o) => o.value === v)?.label ?? String(v);
  const list = Array.isArray(value) ? value.map(name).join(", ") : "";
  switch (op) {
    case "clear":
      return field.type === "multiselect" || field.type === "relation"
        ? `Für ${countText} alle Einträge aus „${field.label}“ entfernen.`
        : `„${field.label}“ für ${countText} leeren.`;
    case "add":
      return `Für ${countText} zu „${field.label}“ hinzufügen: ${list || "…"}.`;
    case "remove":
      return `Für ${countText} aus „${field.label}“ entfernen: ${list || "…"}.`;
    case "increase":
    case "decrease":
      return `„${field.label}“ für ${countText} um ${value || "…"}${field.suffix ? ` ${field.suffix}` : ""} ${op === "increase" ? "erhöhen" : "senken"}. Einträge ohne Wert bleiben leer.`;
    case "percent":
      return `„${field.label}“ für ${countText} um ${value || "…"} % ändern. Einträge ohne Wert bleiben leer.`;
    default: {
      let shown: string;
      if (field.type === "boolean") shown = value ? field.trueLabel ?? "Ja" : field.falseLabel ?? "Nein";
      else if (field.type === "multiselect" || field.type === "relation") return `Für ${countText} „${field.label}“ ersetzen durch: ${list || "…"}.`;
      else if (field.type === "image") shown = value ? "das gewählte Bild" : "…";
      else shown = value === "" || value == null ? "…" : name(value) + (field.suffix ? ` ${field.suffix}` : "");
      return `„${field.label}“ für ${countText} auf „${shown}“ setzen.`;
    }
  }
}

/** Auswahl mehrerer Einträge aus einer Liste, mit Suche bei langen Listen. */
function CheckList({ field, value, onChange }: { field: BulkClientField; value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const options = field.options ?? [];
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  return (
    <div className="rounded-lg border border-[#E2E8F0]">
      {options.length > 8 && (
        <div className="border-b border-[#F1F5F9] p-2">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen" aria-label={`${field.label} durchsuchen`} className={cx(inputClass, "h-9")} />
        </div>
      )}
      <ul className="max-h-[220px] overflow-y-auto p-1">
        {shown.map((o) => (
          <li key={o.value}>
            <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[14px] hover:bg-[#F1F5F9]">
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
                className="h-4 w-4 accent-[var(--admin-accent,#F18652)]"
              />
              {o.label}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className={cx(mutedClass, "px-2 py-2")}>Nichts gefunden</li>}
      </ul>
    </div>
  );
}

/** Freie Begriffe (Mehrfachauswahl ohne feste Liste), mit Komma getrennt. */
function TermsInput({ field, value, onChange }: { field: BulkClientField; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Input
      value={text}
      aria-label={field.label}
      placeholder="Begriffe, mit Komma getrennt"
      onChange={(e) => {
        setText(e.target.value);
        onChange([...new Set(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))]);
      }}
    />
  );
}

function ValueEditor({
  field,
  op,
  value,
  onChange,
  custom,
}: {
  field: BulkClientField;
  op: BulkOp;
  value: unknown;
  onChange: (v: unknown) => void;
  custom?: BulkCustomEditor;
}) {
  if (op === "clear") return null;
  const str = typeof value === "string" ? value : "";
  const label = op === "percent" ? "Prozent (minus = senken)" : op === "increase" || op === "decrease" ? "Betrag" : "Neuer Wert";

  let editor: ReactNode;
  switch (field.type) {
    case "number":
      editor = (
        <AffixInput
          type="number"
          inputMode="decimal"
          step={op === "percent" ? "any" : field.decimals === 0 ? 1 : "any"}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          suffix={op === "percent" ? "%" : field.suffix ?? ""}
          autoFocus
        />
      );
      break;
    case "textarea":
      editor = <Textarea value={str} onChange={(e) => onChange(e.target.value)} maxLength={field.maxLength} autoFocus />;
      break;
    case "boolean":
      // Eigene Zeile, damit der Umschalter nicht auf volle Breite gezogen wird
      editor = (
        <div>
          <Segmented
            label={field.label}
            value={value ? "1" : "0"}
            onChange={(v) => onChange(v === "1")}
            options={[
              { value: "1", label: field.trueLabel ?? "Ja" },
              { value: "0", label: field.falseLabel ?? "Nein" },
            ]}
          />
        </div>
      );
      break;
    case "select":
      editor = (
        <Select value={str} onChange={(e) => onChange(e.target.value)} aria-label={field.label}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "multiselect":
    case "relation":
      editor = field.options ? (
        <CheckList field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
      ) : (
        <TermsInput field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
      );
      break;
    case "date":
      editor = <Input type="date" value={str} onChange={(e) => onChange(e.target.value)} autoFocus />;
      break;
    case "datetime":
      editor = <Input type="datetime-local" value={str} onChange={(e) => onChange(e.target.value)} autoFocus />;
      break;
    case "color":
      editor = (
        <span className="flex items-center gap-2">
          <input type="color" value={str || "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={`${field.label} wählen`} className="h-10 w-12 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-1" />
          <Input value={str} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" className="max-w-[140px]" />
        </span>
      );
      break;
    case "image":
      editor = <ImageUpload value={str} onChange={(url) => onChange(url)} folder={field.folder} />;
      break;
    case "custom":
      editor = custom ? custom({ value, onChange, field }) : <Input value={str} onChange={(e) => onChange(e.target.value)} autoFocus />;
      break;
    default:
      editor = (
        <Input
          type={field.type === "url" ? "url" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          autoFocus
        />
      );
  }

  return (
    <Field label={label} hint={field.hint} as={field.type === "number" || field.type === "select" || field.type === "date" || field.type === "datetime" || ["text", "textarea", "url", "email", "tel"].includes(field.type) ? "label" : "div"}>
      {editor}
    </Field>
  );
}

function EditDialog({
  field,
  count,
  countText,
  pending,
  custom,
  onApply,
  onClose,
}: {
  field: BulkClientField;
  count: number;
  countText: string;
  pending: boolean;
  custom?: BulkCustomEditor;
  onApply: (op: BulkOp, value: unknown) => void;
  onClose: () => void;
}) {
  const [op, setOp] = useState<BulkOp>(field.ops[0]);
  const [value, setValue] = useState<unknown>(() => initialValue(field, field.ops[0]));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const changeOp = (next: BulkOp) => {
    // Werte passen nicht zwischen „Setzen“ und „um %“, Listen bleiben erhalten
    if ((next === "percent") !== (op === "percent") || field.type === "number") setValue(initialValue(field, next));
    setOp(next);
  };

  const missing =
    op !== "clear" &&
    (value === "" || value == null || (Array.isArray(value) && value.length === 0));

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(15,23,42,.4)] p-0 text-left font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased sm:items-center sm:p-4 [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!"
      onClick={(e) => {
        e.stopPropagation();
        if (!pending) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-edit-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,.15)] sm:max-w-[480px] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bulk-edit-title" className="text-[16px] font-semibold">
          {field.label} für {countText} ändern
        </h2>

        <form
          className="mt-5 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!missing) onApply(op, value);
          }}
        >
          {field.ops.length > 1 && (
            <Field label="Art der Änderung" as="div">
              {field.ops.length <= 3 ? (
                <div>
                  <Segmented label="Art der Änderung" value={op} onChange={changeOp} options={field.ops.map((o) => ({ value: o, label: opLabel(field, o) }))} />
                </div>
              ) : (
                <Select value={op} onChange={(e) => changeOp(e.target.value as BulkOp)} aria-label="Art der Änderung">
                  {field.ops.map((o) => (
                    <option key={o} value={o}>
                      {opLabel(field, o)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <ValueEditor key={`${field.key}-${op === "percent"}`} field={field} op={op} value={value} onChange={setValue} custom={custom} />

          <p className={cx(hintClass, "rounded-lg bg-[#FAFAFC] px-3 py-2.5 text-[13px] text-[#334155]")}>{describe(field, op, value, countText)}</p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" disabled={pending || missing}>
              {pending ? "Wird gespeichert …" : count === 1 ? "Übernehmen" : `Für ${count} übernehmen`}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function BulkBar({
  config,
  selection,
  action,
  customEditors,
  onDone,
}: {
  config: BulkClientConfig;
  selection: BulkSelection;
  /** Server Action des Projekts (ruft runBulk auf) */
  action: BulkAction;
  /** Eigene Eingabefelder für Felder vom Typ "custom" */
  customEditors?: Record<string, BulkCustomEditor>;
  /** Nach dem Speichern, z. B. Liste im Browser anpassen. Danach wird die Seite neu geladen. */
  onDone?: (info: { action: "update" | "delete"; ids: string[] }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<BulkClientField | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = selection.count;
  const countText = count === 1 ? `1 ${config.label.one}` : `${count} ${config.label.many}`;
  const tooMany = count > config.maxItems;

  const menuItems = useMemo(
    () => config.fields.map((f) => ({ label: f.label, onSelect: () => setEditing(f) })),
    [config.fields],
  );

  const run = (request: Parameters<BulkAction>[1], success: (n: number) => string) => {
    const ids = request.ids;
    startTransition(async () => {
      try {
        const result = await action(config.key, request);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(success(result.count));
        setEditing(null);
        setConfirmDelete(false);
        selection.clear();
        onDone?.({ action: request.action, ids });
        router.refresh();
      } catch {
        toast.error("Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.");
      }
    });
  };

  const nText = (n: number) => (n === 1 ? `1 ${config.label.one}` : `${n} ${config.label.many}`);

  if (!mounted || count === 0) return null;

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] lg:pl-[248px]">
        <div
          role="toolbar"
          aria-label="Mehrfachbearbeitung"
          className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl bg-[#0F172A] py-1.5 pl-4 pr-1.5 text-[14px] text-white shadow-[0_12px_32px_-8px_rgba(15,23,42,.45)]"
        >
          <span className="mr-2 whitespace-nowrap font-medium" aria-live="polite">
            {count} ausgewählt
          </span>
          {tooMany ? (
            <span className="px-2 text-[13px] text-[#FCA5A5]">Höchstens {config.maxItems} auf einmal</span>
          ) : (
            <>
              {config.fields.length > 0 && (
                <Menu
                  label="Feld für alle ausgewählten ändern"
                  items={menuItems}
                  align="start"
                  width={240}
                  triggerClassName="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium text-white hover:bg-white/10"
                  trigger={() => (
                    <>
                      <PencilLine size={16} strokeWidth={1.75} aria-hidden="true" />
                      Bearbeiten
                      <ChevronDown size={15} strokeWidth={2} className="opacity-70" aria-hidden="true" />
                    </>
                  )}
                />
              )}
              {config.canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-medium text-[#FCA5A5] outline-none hover:bg-white/10 focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,.3)]"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden sm:inline">Löschen</span>
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={selection.clear}
            aria-label="Auswahl aufheben"
            title="Auswahl aufheben"
            className="ml-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,.3)]"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {editing && (
        <EditDialog
          field={editing}
          count={count}
          countText={countText}
          pending={pending}
          custom={customEditors?.[editing.key]}
          onClose={() => setEditing(null)}
          onApply={(op, value) =>
            run({ action: "update", ids: selection.ids, field: editing.key, op, value }, (n) => `„${editing.label}“ für ${nText(n)} geändert.`)
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`${countText} löschen?`}
        confirmLabel={count === 1 ? "Löschen" : `${count} löschen`}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => run({ action: "delete", ids: selection.ids }, (n) => `${nText(n)} gelöscht.`)}
      >
        Das lässt sich nicht rückgängig machen.
      </ConfirmDialog>
    </>,
    document.body,
  );
}
