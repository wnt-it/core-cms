// Welche Core-Versionen sind neuer als die installierte? Nur Server (Seite „Core-Version“). Bewusst keine Server Action,
// also kein öffentlich aufrufbarer Endpunkt. Die Zahl im Menü fragt der Browser selbst ab (AdminShell).
// Quelle: Tags des öffentlichen Repos. Fehler (offline, Rate-Limit) ergeben keinen Hinweis statt einer Fehlermeldung.

import { CORE_VERSION } from "./core-version";
import { CORE_TAGS_URL, newerVersions } from "./version-compare";

const MAX_AGE_MS = 60 * 60 * 1000;
let cache: { at: number; newer: string[] | null } | null = null;

/** Neuere Versionen, neueste zuerst; null: nicht ermittelbar. Einmal pro Stunde je Server-Instanz gefragt. */
export async function getNewerCoreVersions(): Promise<string[] | null> {
  if (cache && Date.now() - cache.at < MAX_AGE_MS) return cache.newer;
  let newer: string[] | null = null;
  try {
    const res = await fetch(CORE_TAGS_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (res.ok) newer = newerVersions(((await res.json()) as { name: string }[]).map((t) => t.name), CORE_VERSION);
  } catch {
    // kein Hinweis
  }
  cache = { at: Date.now(), newer };
  return newer;
}
