// SMTP-Adapter für EmailProvider (Nodemailer). Zugangsdaten kommen aus den Einstellungen im Admin (smtp-settings.ts).
//
// Sicherheit (ab v0.18.0):
//  - Das Zertifikat des Mailservers wird geprüft (gültig, nicht abgelaufen, passt zum Servernamen). Vorher wurde
//    jedes Zertifikat angenommen, auch ein gefälschtes. Abschalten nur über den Schalter in den Einstellungen
//    (email_settings.smtp_skip_cert_check), z. B. für einen eigenen Server mit selbst ausgestelltem Zertifikat.
//  - Ohne Verschlüsselung wird nie gesendet: Port 465 = TLS von Anfang an, alle anderen Ports müssen STARTTLS
//    können (requireTLS). Sonst ginge das Passwort lesbar über das Netz.
//  - Zeitgrenzen, damit ein hängender Mailserver weder Formular noch Admin blockiert.

import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { EmailMessage, EmailProvider } from "./provider";

export interface SmtpProviderConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  /** true: Zertifikat des Mailservers nicht prüfen (Schalter in den Einstellungen). Standard: prüfen. */
  skipCertCheck?: boolean;
}

/** Gemeinsame Verbindungs-Optionen für Versand und Verbindungsprüfung (smtp-check.ts). */
export function buildSmtpTransportOptions(config: SmtpProviderConfig): SMTPTransport.Options {
  const secure = config.secure ?? config.port === 465;
  return {
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: !config.skipCertCheck,
      servername: config.host,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  };
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor(config: SmtpProviderConfig) {
    this.transporter = nodemailer.createTransport(buildSmtpTransportOptions(config));
  }

  async send(message: EmailMessage): Promise<void> {
    // Keine Standardwerte: Absender-Adresse muss vom Aufrufer (aus dem Admin) kommen.
    if (!message.fromEmail) {
      throw new Error("SmtpEmailProvider: fromEmail fehlt - Absender-Adresse im Admin pflegen.");
    }

    await this.transporter.sendMail({
      from: message.fromName ? `"${message.fromName}" <${message.fromEmail}>` : message.fromEmail,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { replyTo: { name: message.replyTo.name ?? "", address: message.replyTo.email } } : {}),
    });
  }
}
