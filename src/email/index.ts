export * from "./provider";
export * from "./resend-provider";
export * from "./smtp-provider";
export * from "./graph-provider";

import type { EmailProvider } from "./provider";
import { ResendEmailProvider, type ResendProviderConfig } from "./resend-provider";
import { SmtpEmailProvider, type SmtpProviderConfig } from "./smtp-provider";
import { GraphEmailProvider, type GraphProviderConfig } from "./graph-provider";

export type EmailProviderSelection =
  | { type: "resend"; config?: ResendProviderConfig }
  | { type: "smtp"; config: SmtpProviderConfig }
  | { type: "microsoft365"; config: GraphProviderConfig };

/**
 * Factory: liefert die passende EmailProvider-Implementierung je nach gewähltem Typ.
 * Der Core selbst versendet über die Versandart aus den Einstellungen (email_settings, siehe smtp-settings.ts):
 * SMTP oder ab v0.19.0 Microsoft 365 (Graph).
 * Resend bleibt für Projekte, die einen eigenen Provider an notifySubmission/submitContactForm übergeben.
 */
export function getEmailProvider(selection: EmailProviderSelection): EmailProvider {
  switch (selection.type) {
    case "resend":
      return new ResendEmailProvider(selection.config);
    case "smtp":
      return new SmtpEmailProvider(selection.config);
    case "microsoft365":
      return new GraphEmailProvider(selection.config);
    default: {
      const _exhaustive: never = selection;
      throw new Error(`getEmailProvider: unbekannter Provider-Typ: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
