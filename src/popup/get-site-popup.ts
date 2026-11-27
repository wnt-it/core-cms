// Liest das Pop-up aus site_settings (Server). Gibt null zurück, wenn es aus ist,
// kein Bild hat oder die Spalten noch fehlen (Migration sql/0.9.0_site_popup.sql).
// Die Einstellungen zu Zeitraum, Häufigkeit, Verzögerung und Seiten (sql/0.12.0_site_popup_options.sql) sind optional:
// fehlen die Spalten, gilt das bisherige Verhalten (einmal pro Besuch, sofort, überall).

// Ohne Cookies lesen (site_settings ist öffentlich lesbar), damit statische bzw.
// zwischengespeicherte Seiten (revalidate) nicht dynamisch werden.
import { getPublicSiteSettings } from "../branding/site-settings";
import {
  POPUP_FREQUENCIES,
  POPUP_MAX_DELAY,
  POPUP_PAGES,
  parsePopupPaths,
  type PopupFrequency,
  type PopupPages,
} from "./options";

export interface SitePopupData {
  imageUrl: string;
  alt: string;
  /** Erster und letzter Tag (JJJJ-MM-TT), leer = offen. */
  from: string;
  until: string;
  frequency: PopupFrequency;
  delaySeconds: number;
  pages: PopupPages;
  paths: string[];
}

export interface SitePopupSettings {
  enabled: boolean;
  imageUrl: string;
  alt: string;
  from: string;
  until: string;
  frequency: PopupFrequency;
  delaySeconds: number;
  pages: PopupPages;
  /** Eine Adresse pro Zeile (wie eingegeben). */
  paths: string;
}

const DEFAULTS: SitePopupSettings = {
  enabled: false,
  imageUrl: "",
  alt: "",
  from: "",
  until: "",
  frequency: "session",
  delaySeconds: 0,
  pages: "all",
  paths: "",
};

export async function getSitePopupSettings(): Promise<SitePopupSettings> {
  try {
    // select("*"), damit ein Projekt ohne Migration nicht mit Fehler abbricht
    const data = ((await getPublicSiteSettings()) ?? {}) as Record<string, any>;
    const delay = Number(data?.popup_delay_seconds);
    return {
      enabled: Boolean(data?.popup_enabled),
      imageUrl: data?.popup_image_url || "",
      alt: data?.popup_image_alt || "",
      from: typeof data?.popup_from === "string" ? data.popup_from : "",
      until: typeof data?.popup_until === "string" ? data.popup_until : "",
      frequency: (POPUP_FREQUENCIES as string[]).includes(data?.popup_frequency) ? data.popup_frequency : "session",
      delaySeconds: Number.isFinite(delay) ? Math.min(Math.max(Math.round(delay), 0), POPUP_MAX_DELAY) : 0,
      pages: (POPUP_PAGES as string[]).includes(data?.popup_pages) ? data.popup_pages : "all",
      paths: typeof data?.popup_paths === "string" ? data.popup_paths : "",
    };
  } catch (err) {
    console.error("[getSitePopupSettings] unexpected error:", err);
    return DEFAULTS;
  }
}

export async function getSitePopup(): Promise<SitePopupData | null> {
  const s = await getSitePopupSettings();
  if (!s.enabled || !s.imageUrl) return null;
  // Der Zeitraum wird im Browser geprüft (zwischengespeicherte Seiten ändern sich nicht von selbst)
  return {
    imageUrl: s.imageUrl,
    alt: s.alt || "Hinweis",
    from: s.from,
    until: s.until,
    frequency: s.frequency,
    delaySeconds: s.delaySeconds,
    pages: s.pages,
    paths: parsePopupPaths(s.paths),
  };
}
