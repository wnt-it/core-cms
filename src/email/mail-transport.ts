// Eine Stelle, die aus den gespeicherten Einstellungen den passenden Versand und die passende Prüfung macht
// (ab v0.19.0): SMTP oder Microsoft 365. Genutzt von Benachrichtigung (submissions/save.ts), Test-E-Mail und
// Verbindungsprüfung im Admin (admin/settings-actions.ts). Nur auf dem Server.

import "server-only";
import type { EmailProvider } from "./provider";
import type { MailConfig } from "./smtp-settings";
import { SmtpEmailProvider } from "./smtp-provider";
import { GraphEmailProvider } from "./graph-provider";
import { checkSmtp } from "./smtp-check";
import { checkGraph } from "./graph-check";
import { classifySmtpError, type SmtpCheckResult } from "./smtp-check-types";
import { classifyGraphError } from "./graph-check-types";

export function providerForConfig(config: MailConfig): EmailProvider {
  if (config.transport === "microsoft365") {
    const { tenantId, clientId, clientSecret, sender } = config;
    return new GraphEmailProvider({ tenantId, clientId, clientSecret, sender });
  }
  const { host, port, user, pass, skipCertCheck } = config;
  return new SmtpEmailProvider({ host, port, user, pass, skipCertCheck });
}

export function checkMailConfig(config: MailConfig, options: { fresh?: boolean } = {}): Promise<SmtpCheckResult> {
  if (config.transport === "microsoft365") return checkGraph(config, options);
  return checkSmtp(config, options);
}

/** Fehler beim Versand erklären wie die Verbindungsprüfung. */
export function classifyMailError(err: unknown, config: MailConfig): SmtpCheckResult {
  if (config.transport === "microsoft365") return classifyGraphError(err, { sender: config.sender, secretExpiresAt: config.secretExpiresAt });
  return classifySmtpError(err, config);
}
