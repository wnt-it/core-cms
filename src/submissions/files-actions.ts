"use server";

// Prüft hochgeladene Anhänge einer Anfrage (ab v0.15.0). Wird von sendForm (core-cms/src/submissions/client)
// nach dem Hochladen aufgerufen, das Projekt muss dafür nichts einbinden.
//
// Geprüft wird gegen das, was beim Absenden angekündigt und dort gegen die Formular-Regeln geprüft wurde:
// gleiche Größe und der echte Dateityp am Inhalt (erste Bytes). Was nicht passt, wird gelöscht.

import { createServiceRoleClient } from "../supabase/service-role";
import { sniffType } from "./form";

const BUCKET = "anfragen";
const MAX_AGE_MS = 60 * 60 * 1000;

export async function confirmSubmissionFiles(
  submissionId: string,
): Promise<{ success: true; accepted: number; rejected: string[] } | { success: false; error: string }> {
  if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) return { success: false, error: "Ungültige Anfrage." };
  const service = createServiceRoleClient();
  if (!service) return { success: false, error: "Anhänge können gerade nicht geprüft werden." };

  const since = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data: files, error } = await service
    .from("submission_files")
    .select("id, path, name, size, mime")
    .eq("submission_id", submissionId)
    .eq("status", "ausstehend")
    .gte("created_at", since);
  if (error) return { success: false, error: "Anhänge können gerade nicht geprüft werden." };

  let accepted = 0;
  const rejected: string[] = [];
  for (const f of files ?? []) {
    let ok = false;
    try {
      const { data: signed } = await service.storage.from(BUCKET).createSignedUrl(f.path, 60);
      if (signed?.signedUrl) {
        const res = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-15" } });
        if (res.ok) {
          const head = new Uint8Array(await res.arrayBuffer()).slice(0, 16);
          const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length"));
          ok = sniffType(head) === f.mime && total === Number(f.size);
        }
      }
    } catch (err) {
      console.error("[submissions] Anhang prüfen fehlgeschlagen", err);
    }
    if (ok) {
      accepted++;
      await service.from("submission_files").update({ status: "ok" }).eq("id", f.id);
    } else {
      rejected.push(f.name);
      await service.storage.from(BUCKET).remove([f.path]);
      await service.from("submission_files").update({ status: "abgelehnt" }).eq("id", f.id);
    }
  }
  return { success: true, accepted, rejected };
}
