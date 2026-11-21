// Spam-Schutz für alle Formulare (ab v0.15.0). Vorher hatte jedes Projekt eine eigene Kopie.
// Hauptsperre bleibt die Vercel-Firewall (Rate-Limit). Hier zusätzlich: unsichtbares Feld,
// Mindestzeit zwischen Anzeige und Absenden (im Browser gemessen) und eine Begrenzung je Adresse.

import { createRateLimiter } from "../shared/rate-limit";

export const MIN_FILL_MS = 2500;

// 5 Anfragen je Adresse in 10 Minuten, pro Server-Instanz, nur als zusätzliche Bremse
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export type GuardResult =
  | { ok: true }
  /** Wahrscheinlich ein Bot: so tun, als hätte es geklappt, damit er nichts lernt */
  | { ok: false; silent: true }
  | { ok: false; silent: false; error: string };

export function tooManyRequests(ip: string, now = Date.now()): boolean {
  return limiter.hit(ip, now);
}

/** Nur für Tests */
export function resetGuard() {
  limiter.reset();
}

export const TOO_MANY_REQUESTS = "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut.";

/** Nur die Bot-Merkmale aus <FormGuard /> (verstecktes Feld, Zeitmessung), ohne Begrenzung je Adresse. */
export function checkBotSignals(input: Record<string, unknown>): GuardResult {
  const honeypot = typeof input.website === "string" ? input.website.trim() : "";
  if (honeypot !== "") return { ok: false, silent: true };
  const age = Number(input.form_age);
  if (input.form_age === undefined || input.form_age === null || input.form_age === "" || !Number.isFinite(age)) {
    return { ok: false, silent: false, error: "Bitte laden Sie die Seite neu und senden Sie das Formular erneut." };
  }
  if (age < MIN_FILL_MS) return { ok: false, silent: true };
  return { ok: true };
}

/** Bot-Merkmale und Begrenzung je Adresse in einem Schritt. receiveSubmission zählt erst nach der Prüfung der Felder,
 *  damit Tippfehler (z. B. eine ungültige E-Mail) nicht das Limit eines echten Besuchers aufbrauchen. */
export function checkGuard(input: Record<string, unknown>, ip: string): GuardResult {
  const bot = checkBotSignals(input);
  if (!bot.ok) return bot;
  if (tooManyRequests(ip)) return { ok: false, silent: false, error: TOO_MANY_REQUESTS };
  return { ok: true };
}
