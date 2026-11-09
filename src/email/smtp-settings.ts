// Liest die SMTP-Einstellungen aus email_settings an EINER Stelle. Benachrichtigung bei neuen Anfragen
// und Test-E-Mail im Admin nutzen dieselbe Prüfung: Klappt der Test, gehen auch die echten E-Mails raus.
// Nur auf dem Server verwenden (entschlüsselt das Passwort). Nicht im Barrel exportiert.

import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../supabase/encryption";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  recipient: string;
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
}

export interface SmtpLoadResult {
  values: SmtpFormValues;
  /** Vollständige Konfiguration oder null, wenn etwas fehlt (dann geht keine E-Mail raus) */
  config: SmtpConfig | null;
  /** Was fehlt, in Worten für den Admin */
  missing: string[];
}

export const EMPTY_SMTP_VALUES: SmtpFormValues = { host: "", port: "587", user: "", fromName: "", fromEmail: "", recipient: "", passStatus: "none" };

type Row = {
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
  smtp_recipient: string | null;
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
  };
  const port = Number(row.smtp_port);
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
    : { host: values.host, port, user: values.user, pass, fromName: values.fromName, fromEmail: values.fromEmail, recipient: values.recipient };
  return { values, config, missing };
}

export async function loadSmtpSettings(client: SupabaseClient): Promise<SmtpLoadResult> {
  const { data, error } = await client
    .from("email_settings")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_recipient")
    .eq("id", "general")
    .maybeSingle();
  if (error) console.error("[email] SMTP-Einstellungen nicht lesbar", error);
  return evaluateSmtpRow(error ? null : (data as Row | null));
}
