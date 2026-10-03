// SMTP-Adapter für EmailProvider.
// Extrahiert aus der bisherigen, fest an Nodemailer/SMTP gekoppelten Logik in
// template/src/lib/services/submissions.ts.

import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailProvider } from "./provider";

export interface SmtpProviderConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor(config: SmtpProviderConfig) {
    const secure = config.secure ?? config.port === 465;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
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
    });
  }
}
