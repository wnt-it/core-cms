// Liest die SMTP-Einstellungen aus email_settings an EINER Stelle. Benachrichtigung bei neuen Anfragen
// und Test-E-Mail im Admin nutzen dieselbe Prüfung: Klappt der Test, gehen auch die echten E-Mails raus.
// Nur auf dem Server verwenden (entschlüsselt das Passwort). Nicht im Barrel exportiert.

// Nur auf dem Server: Ein versehentlicher Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab,
// statt Schlüssel oder Server-Code ins Browser-Bundle zu ziehen.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../supabase/encryption";
import { normalizeFormRecipients, type FormRecipients } from "./form-recipients";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  recipient: string;
  /** Zertifikat des Mailservers nicht prüfen (Schalter in den Einstellungen, ab v0.18.0) */
  skipCertCheck: boolean;
}

/** Gespeicherte Angaben ohne Passwort, so wie sie das Formular im Admin anzeigt. */
export interface SmtpFormValues {
  host: string;
  port: string;
  user: string;
  fromName: string;
  fromEmail: string;
  recipient: string;
  /** none: kein Passwort gespeichert; saved: gespeichert; unreadable: gespeichert, aber nicht zu entschlüsseln (ENCRYPTION_KEY fehlt oder hat sich geändert) */
  passStatus: "none" | "saved" | "unreadable";
  /** Zertifikat des Mailservers nicht prüfen (ab v0.18.0) */
  skipCertCheck: boolean;
  /** false: Spalte smtp_skip_cert_check fehlt (sql/0.18.0_smtp_zertifikat.sql noch nicht ausgeführt) */
  certSwitchAvailable: boolean;
}

export interface SmtpLoadResult {
  values: SmtpFormValues;
  /** Vollständige Konfiguration oder null, wenn etwas fehlt (dann geht keine E-Mail raus) */
  config: SmtpConfig | null;
  /** Was fehlt, in Worten für den Admin */
  missing: string[];
}

export const EMPTY_SMTP_VALUES: SmtpFormValues = { host: "", port: "587", user: "", fromName: "", fromEmail: "", recipient: "", passStatus: "none", skipCertCheck: false, certSwitchAvailable: true };

type Row = {
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
  smtp_recipient: string | null;
  /** ab v0.18.0, fehlt in älteren Datenbanken */
  smtp_skip_cert_check?: boolean | null;
};

/** Reine Auswertung einer Zeile aus email_settings (testbar ohne Datenbank). */
export function evaluateSmtpRow(row: Row | null | undefined, decryptPass: (v: string) => string = decrypt): SmtpLoadResult {
  if (!row) return { values: EMPTY_SMTP_VALUES, config: null, missing: ["alle Angaben"] };
  let pass = "";
  let passStatus: SmtpFormValues["passStatus"] = "none";
  if (row.smtp_pass) {
    try {
      pass = decryptPass(row.smtp_pass);
      passStatus = pass ? "saved" : "unreadable";
    } catch {
      passStatus = "unreadable";
    }
  }
  const values: SmtpFormValues = {
    host: row.smtp_host || "",
    port: row.smtp_port || "587",
    user: row.smtp_user || "",
    fromName: row.smtp_from_name || "",
    fromEmail: row.smtp_from_email || "",
    recipient: row.smtp_recipient || "",
    passStatus,
    skipCertCheck: row.smtp_skip_cert_check === true,
    certSwitchAvailable: "smtp_skip_cert_check" in row,
  };
  // Leerer Port: 587 wie im Formular vorbelegt
  const port = Number(row.smtp_port || 587);
  const missing = [
    !values.host && "Server",
    !(Number.isInteger(port) && port > 0 && port < 65536) && "Port",
    !values.user && "Benutzername",
    passStatus === "none" && "Passwort",
    passStatus === "unreadable" && "lesbares Passwort (bitte neu eingeben)",
    !values.fromEmail && "Absender-Adresse",
    !values.recipient && "Empfänger für Anfragen",
  ].filter((m): m is string => Boolean(m));
  const config = missing.length
    ? null
    : { host: values.host, port, user: values.user, pass, fromName: values.fromName, fromEmail: values.fromEmail, recipient: values.recipient, skipCertCheck: values.skipCertCheck };
  return { values, config, missing };
}

export interface FormRecipientsLoadResult {
  recipients: FormRecipients;
  /** false: Spalte form_recipients fehlt (sql/0.17.0_empfaenger_je_formular.sql noch nicht ausgeführt) */
  available: boolean;
}

const missingColumn = (error: { message?: string } | null) => /form_recipients/.test(error?.message ?? "");

/**
 * Empfänger je Formular (ab v0.17.0). Eigene Abfrage, damit eine fehlende Spalte den Versand nie stört:
 * Dann gilt für alle Formulare der „Empfänger für Anfragen“.
 */
export async function loadFormRecipients(client: SupabaseClient): Promise<FormRecipientsLoadResult> {
  const { data, error } = await client.from("email_settings").select("form_recipients").eq("id", "general").maybeSingle();
  if (error) {
    if (!missingColumn(error)) console.error("[email] Empfänger je Formular nicht lesbar", error);
    return { recipients: {}, available: !missingColumn(error) };
  }
  return { recipients: normalizeFormRecipients((data as { form_recipients?: unknown } | null)?.form_recipients), available: true };
}

export async function loadSmtpSettings(client: SupabaseClient): Promise<SmtpLoadResult> {
  const { data, error } = await client
    .from("email_settings")
    // "*" statt fester Spaltenliste: Eine Spalte, die erst eine neuere SQL-Datei anlegt (smtp_skip_cert_check),
    // darf den Versand nie verhindern, wenn die Datei noch nicht ausgeführt ist.
    .select("*")
    .eq("id", "general")
    .maybeSingle();
  if (error) console.error("[email] SMTP-Einstellungen nicht lesbar", error);
  return evaluateSmtpRow(error ? null : (data as Row | null));
}
