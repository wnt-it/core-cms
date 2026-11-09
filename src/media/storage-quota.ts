// Speicher-Kontingent der Website: reine Rechenlogik ohne Supabase, damit sie getestet werden kann.
//
// Woher das Kontingent kommt (erste Quelle, die etwas liefert):
//   1. STORAGE_QUOTA_GB im Projekt (z. B. "10"), nur für Sonderfälle nötig
//   2. das zentrale Kundenregister von WNT-IT, abgefragt über KONTINGENT_URL mit dem Repo-Namen
//      und der Produktions-Domain, die Vercel jedem Projekt selbst bereitstellt
//   3. sonst keins: Die Mediathek zeigt nur den belegten Speicher
// Es ist eine Anzeige mit Warnung, keine Sperre: Hochladen bleibt auch über dem Kontingent möglich
// (angemessene Nutzung regeln die AGB).

const GB = 1024 * 1024 * 1024;

/** Standard-Adresse des Kundenregisters, überschreibbar mit der Umgebungsvariablen CORE_KONTINGENT_URL. */
export const KONTINGENT_URL = "https://www.wnt-it.com/api/kontingent";

/**
 * Adresse für die Abfrage beim Kundenregister. Braucht mindestens den Repo-Namen oder die Domain
 * (Vercel setzt VERCEL_GIT_REPO_SLUG und VERCEL_PROJECT_PRODUCTION_URL automatisch), sonst null.
 */
export function kontingentAbfrageUrl(env: Record<string, string | undefined>): string | null {
  const repo = env.VERCEL_GIT_REPO_SLUG?.trim();
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!repo && !host) return null;
  const url = new URL(env.CORE_KONTINGENT_URL?.trim() || KONTINGENT_URL);
  if (repo) url.searchParams.set("repo", repo);
  if (host) url.searchParams.set("host", host);
  return url.toString();
}

/** Antwort des Kundenregisters ({ kontingentGb: 10 }) in Bytes, sonst null. */
export function kontingentAusAntwort(body: unknown): number | null {
  const gb = (body as { kontingentGb?: unknown } | null)?.kontingentGb;
  return typeof gb === "number" ? parseQuotaGb(String(gb)) : null;
}

/** Ab diesem Anteil wird gewarnt. */
export const STORAGE_WARN_RATIO = 0.8;

export type StorageState = "ok" | "warn" | "full";

/** Liest das Kontingent in Bytes aus einem GB-Wert ("10", "2,5", "25 GB"). Ungültig oder leer: null. */
export function parseQuotaGb(value: string | undefined | null): number | null {
  if (!value) return null;
  const number = Number(value.trim().replace(/\s*gb$/i, "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * GB);
}

/** Anteil (0 bis 1, kann bei Überschreitung größer sein) und Zustand für die Anzeige. */
export function storageStatus(usedBytes: number, quotaBytes: number | null): { ratio: number | null; state: StorageState } {
  if (!quotaBytes) return { ratio: null, state: "ok" };
  const ratio = Math.max(0, usedBytes) / quotaBytes;
  return { ratio, state: ratio >= 1 ? "full" : ratio >= STORAGE_WARN_RATIO ? "warn" : "ok" };
}
