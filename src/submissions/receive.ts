// Nimmt eine Anfrage aus einem beliebigen Formular des Projekts entgegen (ab v0.15.0): Spam-Schutz,
// Prüfung gegen die Formular-Definition, Speichern, Benachrichtigung und, falls erlaubt, Upload-Adressen
// für Anhänge. Nur auf dem Server verwenden (Server Action oder Route Handler des Projekts).

// Nur auf dem Server: Ein versehentlicher Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab,
// statt Schlüssel oder Server-Code ins Browser-Bundle zu ziehen.
import "server-only";
import { headers } from "next/headers";
import { createServiceRoleClient } from "../supabase/service-role";
import { type FormDefinition, storageFileName, toText, validateSubmission } from "./form";
import { checkBotSignals, TOO_MANY_REQUESTS, tooManyRequests } from "./guard";
import { ipFromHeaders } from "../shared/rate-limit";
import { insertSubmission, notifySubmission } from "./save";
import { cleanupPendingAttachments } from "./cleanup";

export const ATTACHMENT_BUCKET = "anfragen";

export interface UploadTicket {
  bucket: string;
  path: string;
  token: string;
}

export type ReceiveResult =
  | { success: true; submissionId?: string; uploads?: UploadTicket[] }
  | { success: false; error: string; field?: string };

/** FormData oder JSON in ein einfaches Objekt; mehrfach vorkommende Felder (Checkboxen) werden zur Liste. */
function toRecord(input: FormData | Record<string, unknown>): Record<string, unknown> {
  if (!(input instanceof FormData)) return input ?? {};
  const out: Record<string, unknown> = {};
  for (const key of new Set(input.keys())) {
    const values = input.getAll(key).filter((v) => typeof v === "string");
    if (values.length) out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}

export async function clientIp(): Promise<string> {
  try {
    return ipFromHeaders(await headers());
  } catch {
    return "unbekannt";
  }
}

export async function receiveSubmission(
  form: FormDefinition,
  input: FormData | Record<string, unknown>,
  /** metadata: zusätzliche Kennzeichnung (z. B. Abteilung); type: abweichende Formular-Art, z. B. "Kontakt · Abteilung" */
  context: { metadata?: Record<string, unknown>; type?: string } = {},
): Promise<ReceiveResult> {
  const data = toRecord(input);

  const guard = checkBotSignals(data);
  if (!guard.ok) return guard.silent ? { success: true } : { success: false, error: guard.error };

  const checked = validateSubmission(form, data);
  if (!checked.ok) return { success: false, error: checked.error, field: checked.field };
  // Erst gültige Anfragen zählen: Ein Tippfehler soll das Limit eines echten Besuchers nicht aufbrauchen
  if (tooManyRequests(await clientIp())) return { success: false, error: TOO_MANY_REQUESTS };
  const { columns, metadata, labels, files } = checked.value;

  if (form.subjectField && !columns.subject) {
    const s = columns[form.subjectField as keyof typeof columns] ?? metadata[form.subjectField];
    if (s) columns.subject = s.slice(0, 200);
  }

  const save = {
    type: context.type?.trim() || form.type,
    columns,
    metadata: { ...metadata, ...(context.metadata ?? {}) },
    labels,
    sourcePage: toText(data.source_page).slice(0, 200) || null,
    sourceUrl: toText(data.source_url).slice(0, 500) || null,
    attachmentCount: files.length,
  };

  const service = createServiceRoleClient();
  if (files.length && !service) {
    console.error("[submissions] Anhänge brauchen SUPABASE_SERVICE_ROLE_KEY.");
    return { success: false, error: "Anhänge können gerade nicht angenommen werden. Bitte versuchen Sie es später erneut." };
  }

  let submissionId: string;
  try {
    submissionId = await insertSubmission(save);
  } catch {
    return { success: false, error: "Die Anfrage konnte leider nicht gesendet werden. Bitte versuchen Sie es später erneut." };
  }

  const uploads: UploadTicket[] = [];
  if (files.length && service) {
    try {
      const rows = files.map((f) => {
        const id = crypto.randomUUID();
        return { id, submission_id: submissionId, path: `${submissionId}/${id}-${storageFileName(f.name, f.type)}`, name: f.name, size: f.size, mime: f.type };
      });
      const { error } = await service.from("submission_files").insert(rows);
      if (error) throw error;
      for (const row of rows) {
        const { data: signed, error: signError } = await service.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(row.path);
        if (signError || !signed) throw signError ?? new Error("Keine Upload-Adresse");
        uploads.push({ bucket: ATTACHMENT_BUCKET, path: row.path, token: signed.token });
      }
    } catch (err) {
      console.error("[submissions] Anhänge vorbereiten fehlgeschlagen", err);
      await service.from("submissions").delete().eq("id", submissionId);
      return { success: false, error: "Anhänge können gerade nicht angenommen werden. Bitte versuchen Sie es später erneut." };
    }
  }

  if (form.notify !== false) await notifySubmission(save, form.notify || {});
  // Nebenbei alte, nie fertig hochgeladene Anhänge anderer Anfragen entfernen (wenige je Aufruf)
  if (service) await cleanupPendingAttachments(service, { limit: 20 });
  return { success: true, submissionId, ...(uploads.length ? { uploads } : {}) };
}
