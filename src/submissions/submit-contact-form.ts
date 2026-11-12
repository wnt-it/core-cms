// Speichert eine Anfrage mit festen Feldern (name/email/...) und offenem `metadata`. Bleibt für bestehende
// Projekte erhalten. Neue Formulare nutzen besser defineForm + receiveSubmission (core-cms/src/submissions/server),
// das bringt Spam-Schutz, Feldbezeichnungen und Anhänge mit.
//
// Ab v0.15.0 gibt der Core keine Pflichtfelder mehr vor. Eine angegebene E-Mail-Adresse muss gültig sein.
// Ab v0.16.0 mit Spam-Schutz: Längengrenzen, höchstens 5 Links, Begrenzung je Adresse und, wenn das Formular
// <FormGuard /> enthält und dessen Felder mitschickt, auch dessen Bot-Prüfung.

import type { EmailProvider } from "../email";
import type { ContactPayload } from "./types";
import { insertSubmission, notifySubmission } from "./save";
import { checkBotSignals, TOO_MANY_REQUESTS, tooManyRequests } from "./guard";
import { clientIp } from "./receive";

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

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MAX_LINKS = 5;

/** Ergebnis für erkannte Bots: sieht aus wie Erfolg, gespeichert wird nichts. */
const SILENT_OK = { success: true, submissionId: undefined, message: "Anfrage erfolgreich erfasst und in der Datenbank gespeichert." };

export async function submitContactForm(payload: ContactPayload, options: SubmitContactFormOptions = {}) {
  // Spam-Schutz wie bei receiveSubmission: Bot-Merkmale nur, wenn das Formular <FormGuard /> mitschickt
  // (ältere Formulare kennen die Felder nicht), die Begrenzung je Adresse immer.
  const raw = payload as ContactPayload & { website?: unknown; form_age?: unknown };
  if (raw.website !== undefined || raw.form_age !== undefined) {
    const bot = checkBotSignals(raw as Record<string, unknown>);
    if (!bot.ok) {
      if (bot.silent) return SILENT_OK;
      throw new Error(bot.error);
    }
  }

  const email = str(payload.email, 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ungültiges E-Mail Format.");
  }
  const message = typeof payload.message === "string" ? payload.message.slice(0, 5000) : "";
  if ((message.match(/https?:\/\//gi) ?? []).length > MAX_LINKS) {
    throw new Error("Die Nachricht enthält zu viele Links.");
  }
  if (tooManyRequests(await clientIp())) throw new Error(TOO_MANY_REQUESTS);

  const input = {
    type: str(payload.type) || "Kontakt",
    columns: {
      name: str(payload.name),
      email,
      phone: str(payload.phone, 40),
      company: str(payload.company),
      subject: str(payload.subject),
      message,
    },
    metadata: payload.metadata ?? null,
    sourcePage: str(payload.sourcePage) || null,
    sourceUrl: str(payload.sourceUrl, 500) || null,
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
