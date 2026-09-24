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
    const fromName = message.fromName || "Website";
    const fromEmail = message.fromEmail || message.to;

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }
}
