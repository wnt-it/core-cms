export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  /** Empfänger von „Antworten“, z. B. der Besucher, der das Formular abgeschickt hat. */
  replyTo?: { name?: string; email: string };
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// Umgesetzt von smtp-provider.ts (Nodemailer, Standard: Zugang aus den Einstellungen im Admin) und
// resend-provider.ts (nur, wenn ein Projekt ihn ausdrücklich übergibt).
