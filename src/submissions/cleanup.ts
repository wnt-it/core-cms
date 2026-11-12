// Räumt Anhänge auf, deren Upload nie bestätigt wurde (Besucher hat abgebrochen, Bot, Verbindungsabbruch).
// Ohne das blieben solche Dateien im privaten Speicher liegen und belegten unbemerkt das Kontingent.
// Läuft nebenbei beim Öffnen des Posteingangs und nach neuen Anfragen, ein Zeitplan ist nicht nötig.
// Nur auf dem Server verwenden (Service-Role).

// Nur auf dem Server: Ein versehentlicher Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab,
// statt Schlüssel oder Server-Code ins Browser-Bundle zu ziehen.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
/** Wie ATTACHMENT_BUCKET in receive.ts (hier nicht importiert, um einen Import-Kreis zu vermeiden) */
const ATTACHMENT_BUCKET = "anfragen";

/** Upload-Adressen gelten 2 Stunden; was danach noch aussteht, kommt nicht mehr. */
export const PENDING_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export async function cleanupPendingAttachments(
  service: SupabaseClient,
  { now = Date.now(), limit = 50 }: { now?: number; limit?: number } = {},
): Promise<number> {
  try {
    const before = new Date(now - PENDING_MAX_AGE_MS).toISOString();
    const { data, error } = await service
      .from("submission_files")
      .select("id, path")
      .eq("status", "ausstehend")
      .lt("created_at", before)
      .limit(limit);
    if (error || !data?.length) return 0;
    const { error: removeError } = await service.storage.from(ATTACHMENT_BUCKET).remove(data.map((f) => f.path));
    if (removeError) {
      console.error("[submissions] Ausstehende Anhänge konnten nicht gelöscht werden", removeError);
      return 0;
    }
    await service.from("submission_files").delete().in("id", data.map((f) => f.id));
    return data.length;
  } catch (err) {
    // Tabelle fehlt (Migration noch nicht gelaufen) oder Speicher nicht erreichbar: nächstes Mal
    console.error("[submissions] Aufräumen fehlgeschlagen", err);
    return 0;
  }
}
