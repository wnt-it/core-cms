// Liest Logo + Site-Name aus derselben site_settings-Tabelle, die auch das
// Admin-Settings-Formular (core-cms/src/admin) pflegt - dadurch übernehmen
// Login/Passwort-Seiten automatisch das aktuelle Branding jedes Kundenprojekts,
// ohne dass jedes Projekt eine eigene Auth-Seite pflegen muss.

import { createClient } from "../supabase/server";

export interface AuthBranding {
  siteName: string;
  logoUrl: string | null;
}

export async function getAuthBranding(): Promise<AuthBranding> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("site_name, logo_url")
      .eq("id", "general")
      .maybeSingle();

    return {
      siteName: data?.site_name || "Admin",
      logoUrl: data?.logo_url || null,
    };
  } catch {
    return { siteName: "Admin", logoUrl: null };
  }
}
