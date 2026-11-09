// Die öffentliche Zeile aus site_settings (id = 'general'), einmal pro Anfrage gelesen (React cache).
// Vorher lasen Branding, Pop-up und Datenschutz-Vorlage dieselbe Zeile jeweils selbst.
// Ohne Cookies (site_settings ist öffentlich lesbar), damit statische Seiten statisch bleiben.

import { cache } from "react";
import { supabase } from "../supabase/browser-singleton";

export type PublicSiteSettings = Record<string, unknown> | null;

export const getPublicSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  try {
    // select("*"): Projekte ohne einzelne Migrationen (z. B. Pop-up-Spalten) sollen nicht scheitern
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", "general").maybeSingle();
    if (error) console.error("[site_settings] konnte nicht gelesen werden:", error.message);
    return (data as Record<string, unknown> | null) ?? null;
  } catch (err) {
    console.error("[site_settings] unerwarteter Fehler:", err);
    return null;
  }
});
