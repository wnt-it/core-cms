// Ermittelt automatisch, was zu einer Website gehört: alle Tabellen der Datenbank (auch die,
// die ein Kundenprojekt selbst angelegt hat) und alle Speicher-Buckets. Kein Projekt muss
// dafür etwas eintragen.
//
// Tabellen stammen aus der OpenAPI-Beschreibung, die die Supabase-Schnittstelle (PostgREST)
// für den Service-Role-Schlüssel bereitstellt. Nur serverseitig verwenden.

import { createServiceRoleClient } from "../supabase/service-role";

/** Tabellen, die nie exportiert werden (Zugangsdaten). */
const EXCLUDED_TABLES = new Set(["email_settings"]);
/** Zusätzlich ausgeschlossen: Namen, die auf Geheimnisse hindeuten. */
const EXCLUDED_PATTERN = /(secret|token|credential|password|passwort|smtp|api_key)/i;

export interface ExportTable {
  name: string;
  /** Spalte des Primärschlüssels, für eine stabile Reihenfolge beim seitenweisen Lesen. */
  primaryKey: string | null;
}

let cache: { at: number; tables: ExportTable[] } | null = null;
const CACHE_MS = 60_000;

export function isExcludedTable(name: string): boolean {
  return EXCLUDED_TABLES.has(name) || EXCLUDED_PATTERN.test(name);
}

/** Spalten mit Namen, die auf Geheimnisse hindeuten, gehen auch aus anderen Tabellen nicht mit. */
export function withoutSecretColumns(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([column]) => !EXCLUDED_PATTERN.test(column)));
}

export async function discoverTables(): Promise<ExportTable[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.tables;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung dieses Projekts.");

  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Die Tabellenliste konnte nicht gelesen werden (Status ${res.status}).`);
  const spec = (await res.json()) as {
    paths?: Record<string, Record<string, unknown>>;
    definitions?: Record<string, { properties?: Record<string, { description?: string }> }>;
  };

  const tables: ExportTable[] = [];
  for (const [name, definition] of Object.entries(spec.definitions ?? {})) {
    if (isExcludedTable(name)) continue;
    // Tabellen erlauben Schreibzugriff, reine Ansichten (Views) meist nicht
    if (!spec.paths?.[`/${name}`]?.post) continue;
    const primaryKey =
      Object.entries(definition.properties ?? {}).find(([, p]) => /primary key/i.test(p.description ?? ""))?.[0] ?? null;
    tables.push({ name, primaryKey });
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));

  cache = { at: Date.now(), tables };
  return tables;
}

export interface ExportMediaFile {
  bucket: string;
  path: string;
  size: number;
}

let mediaCache: { at: number; files: ExportMediaFile[] } | null = null;

/** Alle Dateien in allen Speicher-Buckets (rekursiv durch die Ordner). Eine Minute zwischengespeichert. */
export async function listAllMedia(): Promise<ExportMediaFile[]> {
  if (mediaCache && Date.now() - mediaCache.at < CACHE_MS) return mediaCache.files;
  const admin = createServiceRoleClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung dieses Projekts.");

  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(error.message);

  const files: ExportMediaFile[] = [];
  const PAGE = 1000;

  async function walk(bucket: string, prefix: string) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error: listError } = await admin!.storage.from(bucket).list(prefix, { limit: PAGE, offset });
      if (listError) throw new Error(listError.message);
      for (const entry of data ?? []) {
        const full = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Ordner haben keine id, Dateien schon
        if (entry.id === null || entry.id === undefined) await walk(bucket, full);
        else files.push({ bucket, path: full, size: Number((entry.metadata as { size?: number } | null)?.size ?? 0) });
      }
      if (!data || data.length < PAGE) break;
    }
  }

  for (const bucket of buckets ?? []) await walk(bucket.name, "");
  mediaCache = { at: Date.now(), files };
  return files;
}
