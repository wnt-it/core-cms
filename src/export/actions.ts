"use server";

import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service-role";
import { discoverTables, listAllMedia, withoutSecretColumns, type ExportMediaFile } from "./discover";

const EXPORT_PAGE_SIZE = 1000;

type Fail = { ok: false; error: string };

// Server Actions sind öffentlich aufrufbar: Jede prüft selbst, ob jemand angemeldet ist.
async function requireUser(): Promise<Fail | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? null : { ok: false, error: "Nicht angemeldet." };
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Unbekannter Fehler.");

export async function getExportPlan(): Promise<
  | { ok: true; tables: { name: string; count: number | null }[]; mediaCount: number; mediaBytes: number }
  | Fail
> {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const admin = createServiceRoleClient();
    if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung dieses Projekts." };
    const tables = await discoverTables();
    const counted = await Promise.all(
      tables.map(async (t) => {
        const { count } = await admin.from(t.name).select("*", { count: "exact", head: true });
        return { name: t.name, count: count ?? null };
      })
    );
    const media = await listAllMedia();
    return { ok: true, tables: counted, mediaCount: media.length, mediaBytes: media.reduce((s, f) => s + f.size, 0) };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** Eine Seite Zeilen einer Tabelle (nur Tabellen, die der Export kennt). */
export async function readExportTable(
  table: string,
  offset: number
): Promise<{ ok: true; rows: Record<string, unknown>[]; done: boolean } | Fail> {
  const denied = await requireUser();
  if (denied) return denied;
  if (!Number.isInteger(offset) || offset < 0) return { ok: false, error: "Ungültiger Bereich." };
  try {
    const known = (await discoverTables()).find((t) => t.name === table);
    if (!known) return { ok: false, error: "Unbekannte Tabelle." };
    const admin = createServiceRoleClient();
    if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung dieses Projekts." };
    let query = admin.from(known.name).select("*");
    if (known.primaryKey) query = query.order(known.primaryKey, { ascending: true });
    const { data, error } = await query.range(offset, offset + EXPORT_PAGE_SIZE - 1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: ((data ?? []) as Record<string, unknown>[]).map(withoutSecretColumns), done: (data?.length ?? 0) < EXPORT_PAGE_SIZE };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function listExportMedia(): Promise<{ ok: true; files: ExportMediaFile[] } | Fail> {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    return { ok: true, files: await listAllMedia() };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** Kurzlebige Download-Adressen (1 Stunde), damit auch nicht öffentliche Buckets exportiert werden können. */
export async function signExportMedia(
  items: { bucket: string; path: string }[]
): Promise<{ ok: true; urls: Record<string, string> } | Fail> {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const admin = createServiceRoleClient();
    if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung dieses Projekts." };
    if (!Array.isArray(items)) return { ok: false, error: "Ungültige Anfrage." };
    // Nur Dateien, die der Export selbst gefunden hat: keine beliebigen Buckets oder Pfade vom Browser
    const known = new Set((await listAllMedia()).map((f) => `${f.bucket}/${f.path}`));
    const urls: Record<string, string> = {};
    const byBucket = new Map<string, string[]>();
    for (const i of items.slice(0, 200)) {
      if (typeof i?.bucket !== "string" || typeof i?.path !== "string" || !known.has(`${i.bucket}/${i.path}`)) continue;
      byBucket.set(i.bucket, [...(byBucket.get(i.bucket) ?? []), i.path]);
    }
    for (const [bucket, paths] of byBucket) {
      const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 3600);
      if (error) return { ok: false, error: error.message };
      for (const row of data ?? []) if (row.signedUrl && row.path) urls[`${bucket}/${row.path}`] = row.signedUrl;
    }
    return { ok: true, urls };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
