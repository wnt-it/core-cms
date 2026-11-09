// Welche Felder „Einstellungen → Website & Branding“ in site_settings schreiben darf, und in welcher Form.
// Server Actions sind öffentlich aufrufbar: Ohne Liste ließe sich jede Spalte setzen (auch id, popup_* usw.).

export const GENERAL_SETTINGS_FIELDS = [
  "site_name",
  "site_tagline",
  "site_description",
  "logo_url",
  "favicon_url",
  "contact_email",
  "contact_phone",
  "address_street",
  "address_city",
  "social_links",
] as const;
export type GeneralSettingsField = (typeof GENERAL_SETTINGS_FIELDS)[number];

const URL_FIELDS = new Set<string>(["logo_url", "favicon_url"]);
const MAX_TEXT = 2000;

/** Bild-Adresse: http(s) oder ein Pfad der eigenen Website. Alles andere (javascript:, data: ...) wird verworfen. */
function safeUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, MAX_TEXT);
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? s.slice(0, MAX_TEXT) : null;
  } catch {
    return null;
  }
}

/** Nimmt nur bekannte Felder, kürzt Texte, prüft Adressen. Unbekannte Felder nennt `ignored`. */
export function sanitizeGeneralSettings(payload: unknown): { values: Partial<Record<GeneralSettingsField, unknown>>; ignored: string[] } {
  const src = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const values: Partial<Record<GeneralSettingsField, unknown>> = {};
  const allowed = new Set<string>(GENERAL_SETTINGS_FIELDS);
  const ignored = Object.keys(src).filter((k) => !allowed.has(k));
  for (const key of GENERAL_SETTINGS_FIELDS) {
    if (!(key in src)) continue;
    const v = src[key];
    if (key === "social_links") {
      if (v === null || (typeof v === "object" && !Array.isArray(v))) values[key] = v;
      continue;
    }
    if (v === null || v === undefined) {
      values[key] = null;
    } else if (typeof v === "string") {
      values[key] = URL_FIELDS.has(key) ? safeUrl(v) : v.trim().slice(0, MAX_TEXT);
    }
  }
  return { values, ignored };
}

/** Spalten, die ein Projekt über updateHeroImageSetting nie setzen darf (Kern-Spalten und alles, was der Core verwaltet). */
export function isAllowedImageSettingColumn(column: string): boolean {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(column)) return false;
  if (["id", "created_at", "updated_at"].includes(column)) return false;
  if ((GENERAL_SETTINGS_FIELDS as readonly string[]).includes(column)) return false;
  return !/^(popup_|smtp_|email_)/.test(column);
}
