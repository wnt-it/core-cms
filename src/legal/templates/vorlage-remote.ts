// Neueste Fassung der Datenschutz-Vorlage (nur Server). Liest datenschutz-vorlage.json vom Branch live des öffentlichen
// core-cms-Repos. So braucht eine Textänderung kein Release: Merge nach live genügt, die Projekte sehen sie im Admin.
// Nicht erreichbar, ungültig oder älter als die mitgelieferte Fassung: Es gilt die mitgelieferte.
// Übernommen wird der Text nie automatisch, sondern erst mit „Text aus Vorlage holen“ im Admin.

import { BUNDLED_VORLAGE } from "./datenschutz";
import { compareVorlageVersion, parseVorlageText, type DatenschutzVorlageText } from "./vorlage-text";

export const VORLAGE_URL = "https://raw.githubusercontent.com/wnt-it/core-cms/live/src/legal/templates/datenschutz-vorlage.json";
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_BYTES = 1_000_000;
let cache: { at: number; vorlage: DatenschutzVorlageText } | null = null;

async function fetchRemote(): Promise<DatenschutzVorlageText | null> {
  try {
    const res = await fetch(VORLAGE_URL, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
    const text = await res.text();
    if (text.length > MAX_BYTES) return null;
    const vorlage = parseVorlageText(JSON.parse(text));
    // Eine Version weit in der Zukunft würde alle späteren Fassungen dauerhaft verdecken
    const datum = vorlage ? Date.parse(vorlage.version.slice(0, 10)) : NaN;
    if (!vorlage || !(datum <= Date.now() + 31 * 24 * 60 * 60 * 1000)) return null;
    return vorlage;
  } catch {
    return null;
  }
}

/** Die neueste gültige Fassung (höchstens alle 5 Minuten neu geladen, je Server-Instanz). */
export async function getDatenschutzVorlageText(): Promise<DatenschutzVorlageText> {
  if (cache && Date.now() - cache.at < MAX_AGE_MS) return cache.vorlage;
  const remote = await fetchRemote();
  const vorlage = remote && compareVorlageVersion(remote.version, BUNDLED_VORLAGE.version) >= 0 ? remote : BUNDLED_VORLAGE;
  cache = { at: Date.now(), vorlage };
  return vorlage;
}
