// Einfacher, ungebundener Supabase-Client (kein SSR-Cookie-Handling) für öffentliche Reads
// (Branding, Rechtstexte, Pop-up). Ohne Sitzung: kein Login-Zustand, kein Token-Refresh,
// eigener Speicherschlüssel. So stört er im Browser nicht den angemeldeten Client aus client.ts
// (sonst Warnung „Multiple GoTrueClient instances“ und doppelte Sitzungsverwaltung).

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "core-cms-public" },
});
