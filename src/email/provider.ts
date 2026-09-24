export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// Phase 4: resend-provider.ts (Resend API, Standard) und smtp-provider.ts
// (Nodemailer, wie heute in template/src/lib/services/submissions.ts) implementieren beide
// dieses Interface. Auswahl pro Kunde über site_settings (z.B. email_provider: "resend" | "smtp").
