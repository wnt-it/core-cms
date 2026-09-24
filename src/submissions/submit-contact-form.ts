// Quelle: template/src/lib/services/submissions.ts (submitContactForm)
//
// Umgebaut auf das EmailProvider-Interface aus ../email statt fest verdrahtetem
// Nodemailer/SMTP-Aufruf. Verwendet weiterhin SMTP standardmäßig (liest Zugangsdaten
// aus ENV oder der site_settings-Tabelle, wie im Original), kann aber genauso mit
// dem Resend-Adapter aufgerufen werden, indem `emailProvider` übergeben wird.
//
// Generisch gehalten: feste Felder (name/email/...) + offenes `metadata` für
// kundenindividuelle Formularfelder (z.B. projectType/amount/energyType).

import { createClient } from "../supabase/server";
import { decrypt } from "../supabase/encryption";
import { getEmailProvider, type EmailProvider } from "../email";
import type { ContactPayload } from "./types";

export interface SubmitContactFormOptions {
  /**
   * Optionaler, bereits konfigurierter EmailProvider (z.B. Resend). Wenn nicht
   * angegeben, wird wie im Original-Verhalten automatisch ein SMTP-Provider aus
   * ENV-Variablen bzw. den site_settings der Datenbank aufgebaut.
   */
  emailProvider?: EmailProvider;
  /** Absendername für die Benachrichtigungs-E-Mail, falls kein Provider übergeben wird. */
  notificationSubjectPrefix?: string;
  /** Anzeigename der Website für das E-Mail-Template (z.B. "richardprinz"). */
  siteName?: string;
  /** Akzentfarbe für das E-Mail-Template (Hex), Standard: neutral-schwarz. */
  brandColor?: string;
}

export async function submitContactForm(payload: ContactPayload, options: SubmitContactFormOptions = {}) {
  const {
    type = "Kontakt",
    name,
    email,
    phone,
    company,
    subject,
    message,
    sourcePage,
    sourceUrl,
    metadata,
  } = payload;

  if (!name || !email) {
    throw new Error("Name und E-Mail-Adresse sind Pflichtfelder.");
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Ungültiges E-Mail Format.");
  }

  const derivedSourcePage = sourcePage || "Kontaktseite (/kontakt)";
  const cleanSubject = subject?.trim() || `Kontaktanfrage von ${name.trim()}`;

  // 1. Speichere die Anfrage in Supabase in der Tabelle "submissions"
  const supabase = await createClient();
  const insertPayload = {
    type: type || "Kontakt",
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : null,
    company: company ? String(company).trim() : null,
    subject: cleanSubject,
    message: message || "",
    source_page: derivedSourcePage,
    source_url: sourceUrl || null,
    status: "Neu",
    metadata: metadata || null,
  };

  const { data: submission, error: dbError } = await supabase
    .from("submissions")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (dbError) {
    console.error("[CRITICAL DB INSERT ERROR]", dbError);
    throw new Error("Datenbankfehler beim Speichern: " + dbError.message);
  }

  // 2. Optionale E-Mail-Benachrichtigung (SMTP per Default, oder übergebener Provider)
  try {
    let provider = options.emailProvider;
    let fromName = options.siteName || "Formular-Service";
    let fromEmail = "";
    let recipientEmail = "";

    if (!provider) {
      let smtpHost: string = process.env.SMTP_HOST || "";
      let smtpPort: number = Number(process.env.SMTP_PORT) || 587;
      let smtpUser: string = process.env.SMTP_USER || "";
      let rawPassword = process.env.SMTP_PASSWORD || "";
      let smtpPassword: string = rawPassword.includes(":") ? decrypt(rawPassword) : rawPassword;
      fromName = process.env.SMTP_FROM_NAME || fromName;
      fromEmail = process.env.SMTP_FROM_EMAIL || "";
      recipientEmail = process.env.SMTP_RECIPIENT || "";

      // Falls Umgebungsvariablen nicht gesetzt sind, lade aus der Supabase Tabelle site_settings
      if (!smtpHost || !smtpUser || !smtpPassword) {
        const { data: dbSettings } = await supabase
          .from("site_settings")
          .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_recipient")
          .eq("id", "general")
          .maybeSingle();

        if (dbSettings) {
          smtpHost = dbSettings.smtp_host || smtpHost;
          smtpPort = Number(dbSettings.smtp_port) || smtpPort;
          smtpUser = dbSettings.smtp_user || smtpUser;
          if (dbSettings.smtp_pass) {
            try {
              smtpPassword = decrypt(dbSettings.smtp_pass);
            } catch {
              smtpPassword = dbSettings.smtp_pass;
            }
          }
          fromName = dbSettings.smtp_from_name || fromName;
          fromEmail = dbSettings.smtp_from_email || fromEmail || smtpUser || "noreply@example.com";
          recipientEmail = dbSettings.smtp_recipient || recipientEmail || fromEmail;
        }
      }

      if (smtpHost && smtpUser && smtpPassword) {
        provider = getEmailProvider({
          type: "smtp",
          config: { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPassword },
        });
      }
    }

    if (provider && recipientEmail) {
      const brandColor = options.brandColor || "#111111";
      const siteLabel = options.siteName || fromName;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; padding: 28px; color: #111111;">
          <div style="background-color: ${brandColor}; color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${siteLabel} Formulareingang</span>
            <h2 style="margin: 4px 0 0 0; font-size: 20px; color: white;">Neue ${type}-Meldung</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #e8f5e9;">Herkunft: ${derivedSourcePage}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; width: 140px; color: #666666;">Absender:</td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold;">${name}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666666;">E-Mail:</td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${email}" style="color: ${brandColor}; font-weight: bold;">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666666;">Telefon:</td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${phone}</td></tr>` : ""}
            ${company ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666666;">Firma:</td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${company}</td></tr>` : ""}
          </table>
          ${message ? `
            <h4 style="color: #111111; margin-bottom: 8px; font-size: 14px;">Nachricht:</h4>
            <div style="background-color: #f9f9f9; border: 1px solid #eeeeee; padding: 16px; border-radius: 12px; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
          ` : ""}
          <div style="font-size: 11px; color: #888888; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px; display: flex; justify-content: space-between;">
            <span>${siteLabel}</span>
            <span>In Supabase DB archiviert</span>
          </div>
        </div>
      `;

      await provider.send({
        to: recipientEmail,
        subject: `[${options.notificationSubjectPrefix || "Kontakt"}] ${cleanSubject}`,
        html,
        fromName,
        fromEmail: fromEmail || recipientEmail,
      });
    }
  } catch (mailErr) {
    console.warn("[EMAIL SEND WARNING - falling back to DB only]", mailErr);
  }

  return {
    success: true,
    submissionId: submission?.id || null,
    message: "Anfrage erfolgreich erfasst und in der Datenbank gespeichert.",
  };
}
