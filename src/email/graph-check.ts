// Verbindungsprüfung für die Versandart „Microsoft 365“ (ab v0.19.0), ohne eine E-Mail zu senden:
// holt ein Token beim Tenant (Tenant-ID, Client-ID, Secret) und liest daraus das Senderecht, falls es in
// Entra ID vergeben ist. Auswertung in graph-check-types.ts. Nur auf dem Server verwenden (bekommt das Secret).

import "server-only";
import { createHash } from "node:crypto";
import { fetchGraphToken, type GraphProviderConfig } from "./graph-provider";
import { classifyGraphError, graphOkResult } from "./graph-check-types";
import type { SmtpCheckResult } from "./smtp-check-types";

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; result: SmtpCheckResult }>();

export async function checkGraph(
  config: GraphProviderConfig & { secretExpiresAt?: string | null },
  { fresh = false }: { fresh?: boolean } = {},
): Promise<SmtpCheckResult> {
  const key = createHash("sha256").update([config.tenantId, config.clientId, config.clientSecret, config.sender, config.secretExpiresAt ?? ""].join("\u0000")).digest("hex");
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return { ...hit.result, cached: true };

  const target = { sender: config.sender, secretExpiresAt: config.secretExpiresAt };
  let result: SmtpCheckResult;
  try {
    const token = await fetchGraphToken(config, { fresh: true });
    result = graphOkResult(target, token.roles);
  } catch (err) {
    result = classifyGraphError(err, target);
  }
  cache.set(key, { at: Date.now(), result });
  if (cache.size > 50) cache.delete(cache.keys().next().value as string);
  return result;
}
