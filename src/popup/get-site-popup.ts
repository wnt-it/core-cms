// Liest das Pop-up aus site_settings (Server). Gibt null zurück, wenn es aus ist,
// kein Bild hat oder die Spalten noch fehlen (Migration sql/0.9.0_site_popup.sql).

// Ohne Cookies lesen (site_settings ist öffentlich lesbar), damit statische bzw.
// zwischengespeicherte Seiten (revalidate) nicht dynamisch werden.
import { supabase } from "../supabase/browser-singleton";

export interface SitePopupData {
  imageUrl: string;
  alt: string;
}

export interface SitePopupSettings {
  enabled: boolean;
  imageUrl: string;
  alt: string;
}

export async function getSitePopupSettings(): Promise<SitePopupSettings> {
  try {
    // select("*"), damit ein Projekt ohne Migration nicht mit Fehler abbricht
    const { data } = await supabase.from("site_settings").select("*").eq("id", "general").maybeSingle();
    return {
      enabled: Boolean(data?.popup_enabled),
      imageUrl: data?.popup_image_url || "",
      alt: data?.popup_image_alt || "",
    };
  } catch (err) {
    console.error("[getSitePopupSettings] unexpected error:", err);
    return { enabled: false, imageUrl: "", alt: "" };
  }
}

export async function getSitePopup(): Promise<SitePopupData | null> {
  const s = await getSitePopupSettings();
  if (!s.enabled || !s.imageUrl) return null;
  return { imageUrl: s.imageUrl, alt: s.alt || "Hinweis" };
}
