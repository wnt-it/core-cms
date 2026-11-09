// Speichert eine Anfrage und benachrichtigt per E-Mail. Gemeinsamer Kern für submitContactForm und
// receiveSubmission (ab v0.15.0). Nur auf dem Server verwenden.
//
// Gespeichert wird über den Service-Role-Client: Besucher haben ab sql/0.15.0_posteingang.sql keinen
// direkten Schreibzugriff mehr auf submissions, damit niemand am Spam-Schutz vorbei Einträge anlegt.

// Nur auf dem Server: Ein versehentlicher Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab,
// statt Schlüssel oder Server-Code ins Browser-Bundle zu ziehen.
import "server-only";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service-role";
import { getEmailProvider } from "../email";
import type { EmailProvider } from "../email/provider";
import { loadSmtpSettings } from "../email/smtp-settings";
import type { ColumnField } from "./form";

// Eingaben aus dem öffentlichen Formular dürfen nie als HTML in die Mail gelangen.
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Akzentfarbe nur als gültiger Hex-Wert zulassen (landet in style-Attributen).
function safeColor(value: string | undefined): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#111111";
}

export interface SaveInput {
  type: string;
  columns: Partial<Record<ColumnField, string>>;
  metadata?: Record<string, unknown> | null;
  /** Bezeichnungen der Felder für Posteingang und E-Mail */
  labels?: Record<string, string> | null;
  sourcePage?: string | null;
  sourceUrl?: string | null;
  /** Anzahl angekündigter Anhänge, nur für den Hinweis in der E-Mail */
  attachmentCount?: number;
}

export interface NotifyOptions {
  emailProvider?: EmailProvider;
  subjectPrefix?: string;
  siteName?: string;
  brandColor?: string;
}

const STANDARD_LABELS: Record<ColumnField, string> = {
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  company: "Firma",
  subject: "Betreff",
  message: "Nachricht",
};

function subjectOf(input: SaveInput): string {
  const s = input.columns.subject?.trim();
  if (s) return s;
  const who = input.columns.name?.trim() || input.columns.email?.trim();
  return who ? `${input.type}: ${who}` : `Neue Anfrage (${input.type})`;
}

/** Legt die Anfrage an. Wirft bei Datenbankfehlern, damit der Besucher keine falsche Erfolgsmeldung sieht. */
export async function insertSubmission(input: SaveInput, id: string = crypto.randomUUID()): Promise<string> {
  const row: Record<string, unknown> = {
    id,
    type: input.type || "Kontakt",
    name: input.columns.name || null,
    email: input.columns.email || null,
    phone: input.columns.phone || null,
    company: input.columns.company || null,
    subject: subjectOf(input),
    message: input.columns.message || null,
    source_page: input.sourcePage || null,
    source_url: input.sourceUrl || null,
    status: "Neu",
    metadata: input.metadata && Object.keys(input.metadata).length ? input.metadata : null,
  };
  // Erst ab sql/0.15.0_posteingang.sql vorhanden. Ohne eigene Felder nicht mitschicken, damit ältere
  // Datenbanken mit den Standardfeldern weiter funktionieren.
  // Speichern, sobald eine Bezeichnung vom Standard abweicht (eigene Felder oder z. B. „Ihr Anliegen“ statt „Nachricht“)
  const standard = STANDARD_LABELS as Record<string, string>;
  if (input.labels && Object.entries(input.labels).some(([k, label]) => standard[k] !== label)) row.field_labels = input.labels;

  const service = createServiceRoleClient();
  if (!service) console.warn("[submissions] SUPABASE_SERVICE_ROLE_KEY fehlt, speichere mit dem Besucher-Zugang (geht nach sql/0.15.0_posteingang.sql nicht mehr).");
  const client = service ?? (await createClient());
  let { error } = await client.from("submissions").insert(row);
  // Ohne sql/0.15.0_posteingang.sql fehlt die Spalte field_labels: dann ohne Bezeichnungen speichern statt die Anfrage zu verlieren
  if (error && "field_labels" in row && /field_labels/.test(error.message ?? "")) {
    console.warn("[submissions] Spalte field_labels fehlt, bitte sql/0.15.0_posteingang.sql ausführen. Speichere ohne Bezeichnungen.");
    delete row.field_labels;
    ({ error } = await client.from("submissions").insert(row));
  }
  if (error) {
    console.error("[submissions] Speichern fehlgeschlagen", error);
    throw new Error("Datenbankfehler beim Speichern: " + error.message);
  }
  return id;
}

/** Schickt die Benachrichtigung. Fehler werden nur protokolliert, die Anfrage ist ja schon gespeichert. */
export async function notifySubmission(input: SaveInput, options: NotifyOptions = {}): Promise<void> {
  try {
    // SMTP ausschließlich aus email_settings (im Admin gepflegt), über den Service-Role-Client, weil die
    // Tabelle Zugangsdaten enthält. Dieselbe Prüfung wie die Test-E-Mail im Admin (loadSmtpSettings).
    const service = createServiceRoleClient();
    if (!service) {
      console.warn("[submissions] SUPABASE_SERVICE_ROLE_KEY fehlt, keine E-Mail gesendet.");
      return;
    }
    const smtp = await loadSmtpSettings(service);
    let provider = options.emailProvider;
    const { fromName, fromEmail, recipient: recipientEmail } = smtp.values;

    if (!provider) {
      if (!smtp.config) {
        console.warn(`[submissions] SMTP im Admin nicht vollständig eingerichtet (fehlt: ${smtp.missing.join(", ")}), keine E-Mail gesendet.`);
        return;
      }
      const { host, port, user, pass } = smtp.config;
      provider = getEmailProvider({ type: "smtp", config: { host, port, user, pass } });
    }
    // Eigener Provider (z. B. Resend): Empfänger und Absender kommen trotzdem aus den Einstellungen
    if (!recipientEmail) {
      console.warn("[submissions] Kein Empfänger für Anfragen eingetragen, keine E-Mail gesendet.");
      return;
    }

    const color = safeColor(options.brandColor);
    const siteLabel = esc(options.siteName || fromName);
    const labels = { ...STANDARD_LABELS, ...(input.labels ?? {}) } as Record<string, string>;
    const rows: [string, string][] = [];
    for (const key of ["name", "email", "phone", "company", "subject"] as const) {
      const v = input.columns[key];
      if (v) rows.push([labels[key], v]);
    }
    for (const [key, v] of Object.entries(input.metadata ?? {})) {
      if (v === null || v === undefined || v === "") continue;
      rows.push([labels[key] ?? key.replace(/_/g, " "), typeof v === "object" ? JSON.stringify(v) : String(v)]);
    }
    if (input.attachmentCount) rows.push(["Anhänge", `${input.attachmentCount} Datei(en), nur im Posteingang abrufbar`]);

    const td = "padding: 8px 0; border-bottom: 1px solid #f0f0f0;";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; padding: 28px; color: #111111;">
        <div style="background-color: ${color}; color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${siteLabel} Formulareingang</span>
          <h2 style="margin: 4px 0 0 0; font-size: 20px; color: white;">Neue Anfrage: ${esc(input.type)}</h2>
          ${input.sourcePage ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #f1f5f9;">Herkunft: ${esc(input.sourcePage)}</p>` : ""}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          ${rows.map(([l, v]) => `<tr><td style="${td} font-weight: bold; width: 160px; color: #666666; vertical-align: top;">${esc(l)}:</td><td style="${td} white-space: pre-wrap;">${esc(v)}</td></tr>`).join("")}
        </table>
        ${input.columns.message ? `
          <h4 style="color: #111111; margin-bottom: 8px; font-size: 14px;">${esc(labels.message)}:</h4>
          <div style="background-color: #f9f9f9; border: 1px solid #eeeeee; padding: 16px; border-radius: 12px; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${esc(input.columns.message)}</div>
        ` : ""}
        <div style="font-size: 11px; color: #888888; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">${siteLabel} · im Posteingang gespeichert</div>
      </div>
    `;

    const email = input.columns.email;
    await provider.send({
      to: recipientEmail,
      subject: `[${options.subjectPrefix || input.type}] ${subjectOf(input)}`.replace(/[\r\n]+/g, " "),
      html,
      fromName,
      fromEmail,
      ...(email ? { replyTo: { name: input.columns.name || email, email } } : {}),
    });
  } catch (err) {
    console.warn("[submissions] E-Mail konnte nicht gesendet werden, Anfrage ist gespeichert.", err);
  }
}
