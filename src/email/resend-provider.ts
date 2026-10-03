// Resend-Adapter für EmailProvider.
// Nutzt die "resend" npm-Library, liest RESEND_API_KEY standardmäßig aus process.env.

import { Resend } from "resend";
import type { EmailMessage, EmailProvider } from "./provider";

export interface ResendProviderConfig {
  apiKey?: string;
}

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor(config: ResendProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ResendEmailProvider: kein API-Key gefunden. RESEND_API_KEY setzen oder apiKey übergeben."
      );
    }
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    // Keine Standardwerte: Absender-Adresse muss vom Aufrufer (aus dem Admin) kommen.
    if (!message.fromEmail) {
      throw new Error("ResendEmailProvider: fromEmail fehlt - Absender-Adresse im Admin pflegen.");
    }

    const { error } = await this.client.emails.send({
      from: message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      throw new Error(`ResendEmailProvider: Versand fehlgeschlagen - ${error.message}`);
    }
  }
}
