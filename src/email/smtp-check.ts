// Verbindungsprüfung zum Mailserver, ohne eine E-Mail zu senden (ab v0.18.0).
// Baut die Verbindung genauso auf wie der echte Versand (buildSmtpTransportOptions), meldet sich an und
// trennt wieder. Ergebnis in drei Schritten: Server erreichbar, Verbindung verschlüsselt (inkl. Zertifikat),
// Anmeldung. Die Auswertung der Fehler (classifySmtpError) ist rein und getestet.
// Nur auf dem Server verwenden (bekommt das Passwort).

import "server-only";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { buildSmtpTransportOptions, type SmtpProviderConfig } from "./smtp-provider";
import type { SmtpCheckResult } from "./smtp-check-types";
import { classifySmtpError, okResult } from "./smtp-check-types";

export type { SmtpCheckResult, SmtpCheckStep, SmtpProblem } from "./smtp-check-types";
export { classifySmtpError } from "./smtp-check-types";

/** Ergebnisse je Zugangsdaten für 10 Minuten merken: Dashboard und Einstellungen melden sich nicht bei jedem Aufruf neu an. */
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; result: SmtpCheckResult }>();

function cacheKey(c: SmtpProviderConfig): string {
  return createHash("sha256").update([c.host, c.port, c.user, c.pass, c.skipCertCheck ? 1 : 0].join("\u0000")).digest("hex");
}

export async function checkSmtp(config: SmtpProviderConfig, { fresh = false }: { fresh?: boolean } = {}): Promise<SmtpCheckResult> {
  const key = cacheKey(config);
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return { ...hit.result, cached: true };

  const transporter = nodemailer.createTransport(buildSmtpTransportOptions(config));
  let result: SmtpCheckResult;
  try {
    await transporter.verify();
    result = okResult(config);
  } catch (err) {
    result = classifySmtpError(err, config);
  } finally {
    transporter.close();
  }
  cache.set(key, { at: Date.now(), result });
  if (cache.size > 50) cache.delete(cache.keys().next().value as string);
  return result;
}
