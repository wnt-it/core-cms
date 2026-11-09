"use server";

// Server Actions der Admin-Seite „Einwilligungen“. Server Actions sind öffentlich aufrufbar:
// Jede prüft selbst, ob jemand angemeldet ist. Lesen läuft über die Rechte des angemeldeten Admins (RLS),
// nur Aufräumen nutzt die Datenbankfunktion consent_cleanup().

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import type { ConsentChoices, ConsentService } from "./types";

export interface ConsentEventRow {
  id: string;
  created_at: string;
  action: "accept_all" | "reject_all" | "custom";
  trigger: "banner" | "settings" | "embed";
  choices: ConsentChoices;
  config_hash: string;
  core_version: string;
  page_path: string | null;
}

export interface ConsentSnapshotRow {
  hash: string;
  created_at: string;
  snapshot: { textVersion?: string; modus?: string; dienste?: ConsentService[] };
}

export type ConsentOverview =
  | { ok: false; error: string; migration?: boolean }
  | {
      ok: true;
      total: number;
      counts: { accept_all: number; reject_all: number; custom: number };
      events: ConsentEventRow[];
      latest: ConsentSnapshotRow | null;
    };

const PAGE = 200;

const isMissingTable = (message?: string) => /consent_(events|configs)|schema cache|does not exist/i.test(message ?? "");

export async function getConsentOverview(): Promise<ConsentOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const events = await supabase.from("consent_events").select("*").order("created_at", { ascending: false }).limit(PAGE);
  if (events.error) {
    return isMissingTable(events.error.message)
      ? { ok: false, migration: true, error: "Die Datenbank-Erweiterung für das Einwilligungsprotokoll fehlt (core-cms v0.14.0, Datei sql/0.14.0_consent.sql)." }
      : { ok: false, error: "Das Protokoll konnte nicht gelesen werden." };
  }

  const count = async (action: string) => {
    const { count: n } = await supabase.from("consent_events").select("id", { count: "exact", head: true }).eq("action", action);
    return n ?? 0;
  };
  // Drei Zählungen (Index auf action, sql/0.16.0_haertung.sql); die Summe ist die Gesamtzahl, andere Werte lässt die Tabelle nicht zu
  const [accept_all, reject_all, custom, latest] = await Promise.all([
    count("accept_all"),
    count("reject_all"),
    count("custom"),
    supabase.from("consent_configs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const total = accept_all + reject_all + custom;

  return {
    ok: true,
    total,
    counts: { accept_all, reject_all, custom },
    events: (events.data ?? []) as ConsentEventRow[],
    latest: (latest.data as ConsentSnapshotRow | null) ?? null,
  };
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  // Tabellenprogramme führen Zellen mit führendem = + - @ als Formel aus
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Gesamtes Protokoll als CSV (Semikolon, UTF-8 mit BOM für Excel). */
export async function exportConsentCsv(): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const rows: ConsentEventRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("consent_events")
      .select("*")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) return { ok: false, error: "Das Protokoll konnte nicht gelesen werden." };
    rows.push(...((data ?? []) as ConsentEventRow[]));
    if (!data || data.length < 1000) break;
  }
  const head = ["Zeitpunkt (UTC)", "Aktion", "Ausgelöst über", "Seite", "Auswahl", "Textstand (Hash)", "Core-Version"];
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.action,
      r.trigger,
      r.page_path ?? "",
      Object.entries(r.choices ?? {})
        .map(([id, v]) => `${id}=${v ? "an" : "aus"}`)
        .join(" "),
      r.config_hash,
      r.core_version,
    ]
      .map(csvCell)
      .join(";"),
  );
  return { ok: true, csv: `﻿${[head.join(";"), ...lines].join("\n")}\n` };
}

/** Löscht Einträge nach Ablauf der Frist (Standard: laufendes Jahr plus 3 Jahre). */
export async function cleanupConsent(years = 3): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!Number.isInteger(years) || years < 1 || years > 10) return { ok: false, error: "Ungültige Aufbewahrungsdauer." };

  const { data, error } = await supabase.rpc("consent_cleanup", { p_years: years });
  if (error) {
    console.error("consent_cleanup fehlgeschlagen:", error.message);
    return { ok: false, error: "Aufräumen ist fehlgeschlagen." };
  }
  revalidatePath("/admin/einwilligungen");
  return { ok: true, removed: Number(data) || 0 };
}
