// Liest die E-Mail-Einstellungen aus email_settings an EINER Stelle. Benachrichtigung bei neuen Anfragen
// und Test-E-Mail im Admin nutzen dieselbe Prüfung: Klappt der Test, gehen auch die echten E-Mails raus.
// Zwei Versandarten (ab v0.19.0): SMTP (Benutzername/Passwort) und Microsoft 365 (Graph, App-Registrierung).
// Nur auf dem Server verwenden (entschlüsselt Passwort und Secret). Nicht im Barrel exportiert.

// Nur auf dem Server: Ein versehentlicher Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab,
// statt Schlüssel oder Server-Code ins Browser-Bundle zu ziehen.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../supabase/encryption";
import { normalizeFormRecipients, type FormRecipients } from "./form-recipients";

export type MailTransport = "smtp" | "microsoft365";

export interface SmtpConfig {
  transport: "smtp";
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

/** Versandart „Microsoft 365“ (ab v0.19.0): Microsoft Graph mit App-Registrierung (graph-provider.ts). */
export interface Microsoft365Config {
  transport: "microsoft365";
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Absender-Postfach, zugleich Absender-Adresse der E-Mails */
  sender: string;
  /** YYYY-MM-DD oder null */
  secretExpiresAt: string | null;
  fromName: string;
  /** = sender */
  fromEmail: string;
  recipient: string;
}

export type MailConfig = SmtpConfig | Microsoft365Config;

/** Gespeicherte Angaben ohne Passwort und Secret, so wie sie das Formular im Admin anzeigt. */
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
  /** Versandart (ab v0.19.0) */
  transport: MailTransport;
  /** false: Spalten für Microsoft 365 fehlen (sql/0.19.0_microsoft_365.sql noch nicht ausgeführt) */
  msAvailable: boolean;
  msTenantId: string;
  msClientId: string;
  msSender: string;
  /** Wie passStatus, für das Client-Secret. Das Secret selbst verlässt den Server nie. */
  msSecretStatus: "none" | "saved" | "unreadable";
  /** Ablaufdatum des Secrets, YYYY-MM-DD oder "" */
  msSecretExpiresAt: string;
}

export interface SmtpLoadResult {
  values: SmtpFormValues;
  /** Vollständige Konfiguration der gewählten Versandart oder null, wenn etwas fehlt (dann geht keine E-Mail raus) */
  config: MailConfig | null;
  /** Was fehlt, in Worten für den Admin */
  missing: string[];
}

export const EMPTY_SMTP_VALUES: SmtpFormValues = {
  host: "",
  port: "587",
  user: "",
  fromName: "",
  fromEmail: "",
  recipient: "",
  passStatus: "none",
  skipCertCheck: false,
  certSwitchAvailable: true,
  transport: "smtp",
  msAvailable: true,
  msTenantId: "",
  msClientId: "",
  msSender: "",
  msSecretStatus: "none",
  msSecretExpiresAt: "",
};

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
  /** ab v0.19.0 (sql/0.19.0_microsoft_365.sql), fehlen in älteren Datenbanken */
  mail_transport?: string | null;
  ms_tenant_id?: string | null;
  ms_client_id?: string | null;
  ms_client_secret?: string | null;
  ms_sender?: string | null;
  ms_secret_expires_at?: string | null;
};

type SecretStatus = SmtpFormValues["passStatus"];

/** Verschlüsselten Wert lesen: Klartext (bleibt auf dem Server) und Status fürs Formular. */
function readSecret(stored: string | null | undefined, decryptValue: (v: string) => string): { value: string; status: SecretStatus } {
  if (!stored) return { value: "", status: "none" };
  try {
    const value = decryptValue(stored);
    return value ? { value, status: "saved" } : { value: "", status: "unreadable" };
  } catch {
    return { value: "", status: "unreadable" };
  }
}

/** Reine Auswertung einer Zeile aus email_settings (testbar ohne Datenbank). */
export function evaluateSmtpRow(row: Row | null | undefined, decryptPass: (v: string) => string = decrypt): SmtpLoadResult {
  if (!row) return { values: EMPTY_SMTP_VALUES, config: null, missing: ["alle Angaben"] };
  const msAvailable = "mail_transport" in row;
  const transport: MailTransport = msAvailable && row.mail_transport === "microsoft365" ? "microsoft365" : "smtp";
  // Nur das Geheimnis der gewählten Versandart entschlüsseln; beim anderen reicht „gespeichert ja/nein“
  const pass = transport === "smtp" ? readSecret(row.smtp_pass, decryptPass) : { value: "", status: (row.smtp_pass ? "saved" : "none") as SecretStatus };
  const secret = transport === "microsoft365" ? readSecret(row.ms_client_secret, decryptPass) : { value: "", status: (row.ms_client_secret ? "saved" : "none") as SecretStatus };

  const values: SmtpFormValues = {
    host: row.smtp_host || "",
    port: row.smtp_port || "587",
    user: row.smtp_user || "",
    fromName: row.smtp_from_name || "",
    fromEmail: row.smtp_from_email || "",
    recipient: row.smtp_recipient || "",
    passStatus: pass.status,
    skipCertCheck: row.smtp_skip_cert_check === true,
    certSwitchAvailable: "smtp_skip_cert_check" in row,
    transport,
    msAvailable,
    msTenantId: row.ms_tenant_id || "",
    msClientId: row.ms_client_id || "",
    msSender: row.ms_sender || "",
    msSecretStatus: secret.status,
    msSecretExpiresAt: (row.ms_secret_expires_at || "").slice(0, 10),
  };

  if (transport === "microsoft365") {
    const missing = [
      !values.msTenantId && "Tenant-ID",
      !values.msClientId && "Client-ID",
      secret.status === "none" && "Client-Secret",
      secret.status === "unreadable" && "lesbares Client-Secret (bitte neu eingeben)",
      !values.msSender && "Absender-Postfach",
      !values.recipient && "Empfänger für Anfragen",
    ].filter((m): m is string => Boolean(m));
    const config: Microsoft365Config | null = missing.length
      ? null
      : {
          transport,
          tenantId: values.msTenantId,
          clientId: values.msClientId,
          clientSecret: secret.value,
          sender: values.msSender,
          secretExpiresAt: values.msSecretExpiresAt || null,
          fromName: values.fromName,
          fromEmail: values.msSender,
          recipient: values.recipient,
        };
    return { values, config, missing };
  }

  // Leerer Port: 587 wie im Formular vorbelegt
  const port = Number(row.smtp_port || 587);
  const missing = [
    !values.host && "Server",
    !(Number.isInteger(port) && port > 0 && port < 65536) && "Port",
    !values.user && "Benutzername",
    pass.status === "none" && "Passwort",
    pass.status === "unreadable" && "lesbares Passwort (bitte neu eingeben)",
    !values.fromEmail && "Absender-Adresse",
    !values.recipient && "Empfänger für Anfragen",
  ].filter((m): m is string => Boolean(m));
  const config: SmtpConfig | null = missing.length
    ? null
    : { transport: "smtp", host: values.host, port, user: values.user, pass: pass.value, fromName: values.fromName, fromEmail: values.fromEmail, recipient: values.recipient, skipCertCheck: values.skipCertCheck };
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
    // "*" statt fester Spaltenliste: Eine Spalte, die erst eine neuere SQL-Datei anlegt (smtp_skip_cert_check,
    // mail_transport, ms_*), darf den Versand nie verhindern, wenn die Datei noch nicht ausgeführt ist.
    .select("*")
    .eq("id", "general")
    .maybeSingle();
  if (error) console.error("[email] SMTP-Einstellungen nicht lesbar", error);
  return evaluateSmtpRow(error ? null : (data as Row | null));
}
