// Einfacher, ungebundener Supabase-Client (kein SSR-Cookie-Handling).
// Für Fälle außerhalb von React Server/Client Components (Skripte, einmalige Reads).
// Quelle: template/src/config/supabase.ts

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
