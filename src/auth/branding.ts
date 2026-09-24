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
    console.error("[getAuthBranding] NEXT_PUBLIC_SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("site_name, logo_url")
      .eq("id", "general")
      .maybeSingle();

    if (error) {
      console.error("[getAuthBranding] site_settings query failed:", error.message);
    }

    return {
      siteName: data?.site_name || "Admin",
      logoUrl: data?.logo_url || null,
    };
  } catch (err) {
    console.error("[getAuthBranding] unexpected error:", err);
    return { siteName: "Admin", logoUrl: null };
  }
}
