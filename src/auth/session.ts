// Eine Stelle für „ist jemand angemeldet?“ in Server Actions und Server-Seiten.
// Server Actions sind öffentlich aufrufbar: Jede prüft selbst, ob ein Admin angemeldet ist, und verlässt sich
// nicht nur auf RLS. Vorher stand dieselbe Abfrage in jeder Datei einzeln.

import type { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

export const NOT_LOGGED_IN = "Nicht angemeldet.";

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Supabase-Client mit Sitzung und angemeldeter Benutzer, oder null, wenn niemand angemeldet ist. */
export async function getAdminSession(): Promise<{ supabase: ServerSupabase; user: User } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}
