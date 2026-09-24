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
    const fromName = message.fromName || "Website";
    const fromEmail = message.fromEmail || "onboarding@resend.dev";

    const { error } = await this.client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      throw new Error(`ResendEmailProvider: Versand fehlgeschlagen - ${error.message}`);
    }
  }
}
