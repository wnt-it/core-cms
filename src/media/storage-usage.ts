"use server";

// Belegter Speicher aller Buckets der Website und das Kontingent aus STORAGE_QUOTA_GB.
// Zählt alle Dateien im Speicher (auch solche, die nicht in der Mediathek registriert sind),
// weil genau das das Kontingent belegt.

import { createClient } from "../supabase/server";
import { listAllMedia } from "../export/discover";
import { kontingentAbfrageUrl, kontingentAusAntwort, parseQuotaGb } from "./storage-quota";

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

export async function getStorageUsage(): Promise<
  { ok: true; usedBytes: number; fileCount: number; quotaBytes: number | null } | { ok: false; error: string }
> {
  // Server Actions sind öffentlich aufrufbar: nur für angemeldete Nutzer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  try {
    const [files, quotaBytes] = await Promise.all([listAllMedia({ fresh: true }), getQuotaBytes()]);
    return {
      ok: true,
      usedBytes: files.reduce((sum, f) => sum + f.size, 0),
      fileCount: files.length,
      quotaBytes,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
}
