export * from "./provider";
export * from "./resend-provider";
export * from "./smtp-provider";

import type { EmailProvider } from "./provider";
import { ResendEmailProvider, type ResendProviderConfig } from "./resend-provider";
import { SmtpEmailProvider, type SmtpProviderConfig } from "./smtp-provider";

export type EmailProviderSelection =
  | { type: "resend"; config?: ResendProviderConfig }
  | { type: "smtp"; config: SmtpProviderConfig };

/**
 * Factory: liefert die passende EmailProvider-Implementierung je nach gewähltem Typ.
 * Auswahl pro Kunde z.B. über site_settings.email_provider ("resend" | "smtp").
 */
export function getEmailProvider(selection: EmailProviderSelection): EmailProvider {
  switch (selection.type) {
    case "resend":
      return new ResendEmailProvider(selection.config);
    case "smtp":
      return new SmtpEmailProvider(selection.config);
    default: {
      const _exhaustive: never = selection;
      throw new Error(`getEmailProvider: unbekannter Provider-Typ: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
