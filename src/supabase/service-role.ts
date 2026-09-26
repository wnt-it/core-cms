// Service-Role-Client: umgeht RLS komplett, nur für serverseitigen Zugriff auf
// Daten, die niemals über den öffentlichen anon-Key lesbar sein dürfen (z.B.
// SMTP-Zugangsdaten in email_settings). NIEMALS im Browser verwenden, NIEMALS
// den Service-Role-Key clientseitig exponieren.
//
// Braucht die Umgebungsvariable SUPABASE_SERVICE_ROLE_KEY (ohne NEXT_PUBLIC_-Präfix,
// damit sie garantiert nicht ins Browser-Bundle gelangt) - zu finden im
// Supabase-Dashboard unter Project Settings -> API -> service_role secret.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
