// Speichert eine Anfrage mit festen Feldern (name/email/...) und offenem `metadata`. Bleibt für bestehende
// Projekte erhalten. Neue Formulare nutzen besser defineForm + receiveSubmission (core-cms/src/submissions/server),
// das bringt Spam-Schutz, Feldbezeichnungen und Anhänge mit.
//
// Ab v0.15.0 gibt der Core keine Pflichtfelder mehr vor. Eine angegebene E-Mail-Adresse muss gültig sein.

import type { EmailProvider } from "../email";
import type { ContactPayload } from "./types";
import { insertSubmission, notifySubmission } from "./save";

export interface SubmitContactFormOptions {
  /** Bereits eingerichteter EmailProvider (z. B. Resend). Ohne: SMTP aus den Einstellungen. */
  emailProvider?: EmailProvider;
  /** Vorsatz im Betreff der Benachrichtigung */
  notificationSubjectPrefix?: string;
  /** Anzeigename der Website für das E-Mail-Template (z. B. Firmenname). */
  siteName?: string;
  /** Akzentfarbe für das E-Mail-Template (Hex), Standard: neutral-schwarz. */
  brandColor?: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function submitContactForm(payload: ContactPayload, options: SubmitContactFormOptions = {}) {
  const email = str(payload.email).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ungültiges E-Mail Format.");
  }

  const input = {
    type: str(payload.type) || "Kontakt",
    columns: {
      name: str(payload.name),
      email,
      phone: str(payload.phone),
      company: str(payload.company),
      subject: str(payload.subject),
      message: typeof payload.message === "string" ? payload.message : "",
    },
    metadata: payload.metadata ?? null,
    sourcePage: str(payload.sourcePage) || null,
    sourceUrl: str(payload.sourceUrl) || null,
  };

  const submissionId = await insertSubmission(input);
  await notifySubmission(input, {
    emailProvider: options.emailProvider,
    subjectPrefix: options.notificationSubjectPrefix,
    siteName: options.siteName,
    brandColor: options.brandColor,
  });

  return {
    success: true,
    submissionId,
    message: "Anfrage erfolgreich erfasst und in der Datenbank gespeichert.",
  };
}
