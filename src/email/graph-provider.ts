// Versandart „Microsoft 365“ (ab v0.19.0): E-Mails über Microsoft Graph statt SMTP.
//
// Microsoft schaltet SMTP mit Benutzername/Passwort (Basic Auth, auch App-Passwörter) in Exchange Online ab.
// Stattdessen meldet sich die Website als App beim Tenant des Kunden an (App-Registrierung in Entra ID,
// Client Credentials: Tenant-ID, Client-ID, Client-Secret) und sendet über
//   POST https://graph.microsoft.com/v1.0/users/{absender}/sendMail
// Das Absender-Postfach (gern eine Shared Mailbox) wird in Exchange per „RBAC for Applications“ bzw.
// Application Access Policy als einziges Postfach freigegeben, das die App nutzen darf (Anleitung: README).
//
// Bewusst ohne neue Abhängigkeit: Token und Versand sind zwei HTTPS-Aufrufe mit fetch.
// Läuft nur auf dem Server (bekommt das Secret), wird aber nicht mit "server-only" markiert, damit
// die Tests den Provider mit einem eigenen fetch prüfen können. Nicht im Browser importieren.

import { createHash } from "node:crypto";
import type { EmailMessage, EmailProvider } from "./provider";

export interface GraphProviderConfig {
  /** Verzeichnis-ID des Tenants (GUID) oder Standarddomain, z. B. kunde.onmicrosoft.com */
  tenantId: string;
  /** Anwendungs-ID (Client-ID) der App-Registrierung */
  clientId: string;
  /** Geheimer Clientschlüssel (Wert, nicht die Secret-ID) */
  clientSecret: string;
  /** Postfach, aus dem gesendet wird, z. B. anfragen@kunde.de */
  sender: string;
  /** Für Tests: eigenes fetch. Standard: globales fetch. */
  fetch?: typeof fetch;
}

export const GRAPH_TOKEN_HOST = "https://login.microsoftonline.com";
export const GRAPH_API = "https://graph.microsoft.com/v1.0";
export const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

const TIMEOUT_MS = 15_000;

/** Fehler beim Token holen oder Senden, mit den Angaben von Microsoft für die Auswertung (graph-check-types.ts). */
export class GraphMailError extends Error {
  constructor(
    message: string,
    readonly stage: "token" | "send",
    readonly status?: number,
    /** Fehlercode von Microsoft, z. B. invalid_client, ErrorAccessDenied */
    readonly code?: string,
    /** Beim Token: AADSTS-Nummern, z. B. [7000215] */
    readonly aadsts: number[] = [],
  ) {
    super(message);
    this.name = "GraphMailError";
  }
}

/** Tenant-ID: GUID oder Domain. Streng geprüft, weil sie Teil der Anmelde-Adresse ist. */
export function isValidTenantId(v: string): boolean {
  return GUID.test(v) || /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v);
}
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidClientId(v: string): boolean {
  return GUID.test(v);
}

export interface GraphToken {
  accessToken: string;
  /** ms seit 1970 */
  expiresAt: number;
  /** Anwendungsberechtigungen aus Entra ID (Claim „roles“), z. B. ["Mail.Send"]. Rechte aus Exchange-RBAC stehen hier nicht. */
  roles: string[];
}

/** Rollen aus dem Access Token lesen (JWT, nur Anzeige, keine Signaturprüfung nötig: das Token kommt direkt von Microsoft). */
export function rolesFromToken(token: string): string[] {
  const part = token.split(".")[1];
  if (!part) return [];
  try {
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { roles?: unknown };
    return Array.isArray(payload.roles) ? payload.roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

// Token je App merken (gilt meist 60-90 Minuten), damit nicht jede Anfrage neu anmeldet.
const tokenCache = new Map<string, GraphToken>();
function tokenKey(c: GraphProviderConfig): string {
  return createHash("sha256").update([c.tenantId, c.clientId, c.clientSecret].join("\u0000")).digest("hex");
}

/** Nur für Tests. */
export function clearGraphTokenCache(): void {
  tokenCache.clear();
}

async function withTimeout(f: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  return f(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/** Holt ein Token für Microsoft Graph (Client Credentials). Wirft GraphMailError mit stage „token“. */
export async function fetchGraphToken(config: GraphProviderConfig, { fresh = false }: { fresh?: boolean } = {}): Promise<GraphToken> {
  const key = tokenKey(config);
  const hit = tokenCache.get(key);
  if (!fresh && hit && hit.expiresAt - 5 * 60_000 > Date.now()) return hit;

  if (!isValidTenantId(config.tenantId)) throw new GraphMailError("Tenant-ID ist ungültig.", "token", undefined, "invalid_tenant_format");
  const f = config.fetch ?? fetch;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: GRAPH_SCOPE,
    grant_type: "client_credentials",
  });
  let res: Response;
  try {
    res = await withTimeout(f, `${GRAPH_TOKEN_HOST}/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    throw networkError(err, "token");
  }
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number | string;
    error?: string;
    error_description?: string;
    error_codes?: number[];
  };
  if (!res.ok || !json.access_token) {
    throw new GraphMailError(
      (json.error_description ?? json.error ?? `HTTP ${res.status}`).split(/\r?\n/)[0].slice(0, 300),
      "token",
      res.status,
      json.error,
      Array.isArray(json.error_codes) ? json.error_codes : [],
    );
  }
  const token: GraphToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000,
    roles: rolesFromToken(json.access_token),
  };
  tokenCache.set(key, token);
  if (tokenCache.size > 50) tokenCache.delete(tokenCache.keys().next().value as string);
  return token;
}

function networkError(err: unknown, stage: "token" | "send"): GraphMailError {
  const e = err as { name?: string; message?: string; cause?: { code?: string } };
  const timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
  return new GraphMailError(
    timeout ? "Microsoft antwortet nicht (Zeitüberschreitung)." : `Keine Verbindung zu Microsoft: ${e?.cause?.code ?? e?.message ?? "unbekannt"}`,
    stage,
    undefined,
    timeout ? "timeout" : "network",
  );
}

/** Adressen aus „a@x.de, b@x.de“ (Empfänger je Formular) als Graph-Empfänger. */
function recipients(to: string) {
  return to
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

/** Nachricht für Graph sendMail (rein, testbar). */
export function buildGraphMessage(message: EmailMessage, sender: string) {
  // Der Name kommt evtl. aus dem öffentlichen Formular: nur druckbare Zeichen, gekürzt
  const clean = (s: string | undefined) => s?.replace(/[\r\n<>"]/g, "").trim().slice(0, 200) || undefined;
  const fromName = clean(message.fromName);
  return {
    message: {
      subject: message.subject.replace(/[\r\n]+/g, " "),
      body: { contentType: "HTML", content: message.html },
      toRecipients: recipients(message.to),
      // Gesendet wird immer aus dem Absender-Postfach; ein anderes „Von“ wäre „Senden als“ und braucht eigene Rechte
      from: { emailAddress: { address: sender, ...(fromName ? { name: fromName } : {}) } },
      ...(message.replyTo
        ? { replyTo: [{ emailAddress: { address: message.replyTo.email, ...(clean(message.replyTo.name) ? { name: clean(message.replyTo.name) } : {}) } }] }
        : {}),
    },
    // Kopie unter „Gesendete Elemente“ des Absender-Postfachs: nachvollziehbar, was rausging
    saveToSentItems: true,
  };
}

export class GraphEmailProvider implements EmailProvider {
  constructor(private config: GraphProviderConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const { sender } = this.config;
    if (!sender) throw new Error("GraphEmailProvider: Absender-Postfach fehlt - im Admin pflegen.");
    const token = await fetchGraphToken(this.config);
    const f = this.config.fetch ?? fetch;
    let res: Response;
    try {
      res = await withTimeout(f, `${GRAPH_API}/users/${encodeURIComponent(sender)}/sendMail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildGraphMessage(message, sender)),
      });
    } catch (err) {
      throw networkError(err, "send");
    }
    // Erfolg: 202 Accepted ohne Inhalt
    if (res.ok) return;
    const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    // Abgelaufenes oder widerrufenes Token: beim nächsten Versuch neu holen
    if (res.status === 401) tokenCache.delete(tokenKey(this.config));
    throw new GraphMailError((json.error?.message ?? `HTTP ${res.status}`).slice(0, 300), "send", res.status, json.error?.code);
  }
}
