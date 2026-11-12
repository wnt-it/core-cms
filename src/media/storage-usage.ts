"use server";

// Belegter Speicher aller Buckets der Website und das Kontingent aus STORAGE_QUOTA_GB.
// Zählt alle Dateien im Speicher (auch solche, die nicht in der Mediathek registriert sind),
// weil genau das das Kontingent belegt.

import { createClient } from "../supabase/server";
import { listAllMedia } from "../export/discover";
import { kontingentAbfrageUrl, kontingentAusAntwort, parseQuotaGb } from "./storage-quota";
import { getAdminSession } from "../auth/session";

/** Kontingent in Bytes: erst STORAGE_QUOTA_GB, dann das zentrale Kundenregister (1 Stunde zwischengespeichert). */
async function getQuotaBytes(): Promise<number | null> {
  const fromEnv = parseQuotaGb(process.env.STORAGE_QUOTA_GB);
  if (fromEnv) return fromEnv;
  const url = kontingentAbfrageUrl(process.env);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return null;
    return kontingentAusAntwort(await res.json());
  } catch {
    // Register nicht erreichbar: nur den belegten Speicher anzeigen
    return null;
  }
}

/** Belegter Speicher: eine Datenbankabfrage (sql/0.16.0_haertung.sql). Ohne die Funktion wie bisher Ordner für Ordner. */
async function usedStorage(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ usedBytes: number; fileCount: number }> {
  const { data, error } = await supabase.rpc("core_storage_usage");
  const row = Array.isArray(data) ? data[0] : data;
  if (!error && row) return { usedBytes: Number(row.used_bytes) || 0, fileCount: Number(row.file_count) || 0 };
  const files = await listAllMedia({ fresh: true });
  return { usedBytes: files.reduce((sum, f) => sum + f.size, 0), fileCount: files.length };
}

export async function getStorageUsage(): Promise<
  { ok: true; usedBytes: number; fileCount: number; quotaBytes: number | null } | { ok: false; error: string }
> {
  // Server Actions sind öffentlich aufrufbar: nur für angemeldete Nutzer
  const auth = await getAdminSession();
  if (!auth) return { ok: false, error: "Nicht angemeldet." };
  const { supabase } = auth;

  try {
    const [used, quotaBytes] = await Promise.all([usedStorage(supabase), getQuotaBytes()]);
    return { ok: true, ...used, quotaBytes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
}
