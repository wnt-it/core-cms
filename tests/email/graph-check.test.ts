// Versandart „Microsoft 365“: Auswertung der Prüfung, Ablauf des Secrets, Eingaben und Einstellungen.
// Ohne echten Tenant, Microsoft-Antworten nachgebaut.
import { afterEach, describe, expect, it } from "vitest";
import { classifyGraphError, graphOkResult, secretExpiry, secretExpiryHint } from "../../src/email/graph-check-types";
import { GraphMailError, clearGraphTokenCache } from "../../src/email/graph-provider";
import { checkGraph } from "../../src/email/graph-check";
import { validateMicrosoft365Input } from "../../src/email/microsoft365-input";
import { evaluateSmtpRow } from "../../src/email/smtp-settings";

const t = { sender: "anfragen@kunde.de" };
const now = new Date(2026, 10, 27, 12);
const tokenErr = (n: number, code = "invalid_request") => new GraphMailError(`AADSTS${n}: …`, "token", 400, code, [n]);

afterEach(() => clearGraphTokenCache());

describe("classifyGraphError", () => {
  it("Tenant, App, Secret", () => {
    expect(classifyGraphError(tokenErr(90002), t)).toMatchObject({ problem: "ms-tenant", steps: { server: "fail" }, transport: "microsoft365" });
    expect(classifyGraphError(new GraphMailError("x", "token", undefined, "invalid_tenant_format"), t).problem).toBe("ms-tenant");
    expect(classifyGraphError(tokenErr(700016, "unauthorized_client"), t)).toMatchObject({ problem: "ms-app", steps: { server: "ok", encryption: "fail" } });
    expect(classifyGraphError(tokenErr(7000222, "invalid_client"), t).problem).toBe("secret-expired");
    const wrong = classifyGraphError(tokenErr(7000215, "invalid_client"), t);
    expect(wrong.problem).toBe("auth");
    expect(wrong.hint).toMatch(/Geheimnis-ID/);
    expect(classifyGraphError(tokenErr(53003), t).message).toMatch(/bedingten Zugriff/);
  });

  it("Versand: fehlendes Recht, Postfach unbekannt, gebremst", () => {
    const denied = classifyGraphError(new GraphMailError("Access is denied.", "send", 403, "ErrorAccessDenied"), t);
    expect(denied).toMatchObject({ problem: "ms-permission", steps: { server: "ok", encryption: "ok", login: "fail" } });
    expect(denied.message).toContain("anfragen@kunde.de");
    expect(denied.hint).toMatch(/RBAC for Applications/);
    expect(classifyGraphError(new GraphMailError("x", "send", 404, "ErrorInvalidUser"), t).problem).toBe("ms-mailbox");
    expect(classifyGraphError(new GraphMailError("x", "send", 429, "TooManyRequests"), t).message).toMatch(/bremst/);
  });

  it("Microsoft nicht erreichbar", () => {
    expect(classifyGraphError(new GraphMailError("x", "token", undefined, "timeout"), t)).toMatchObject({ problem: "timeout", steps: { server: "fail" } });
  });
});

describe("graphOkResult", () => {
  it("Mail.Send aus Entra ID: Haken und Hinweis auf die Beschränkung per Policy", () => {
    const r = graphOkResult({ ...t, secretExpiresAt: "2027-11-01" }, ["Mail.Send"], now);
    expect(r).toMatchObject({ ok: true, steps: { server: "ok", encryption: "ok", login: "ok" }, mailbox: "anfragen@kunde.de" });
    expect(r.hint).toMatch(/Application Access Policy/);
  });

  it("ohne Rolle im Token (Exchange-RBAC): Senderecht nicht geprüft, Verweis auf die Test-E-Mail", () => {
    const r = graphOkResult(t, [], now);
    expect(r).toMatchObject({ ok: true, steps: { login: "skip" } });
    expect(r.hint).toMatch(/Test-E-Mail/);
    expect(r.hint).toMatch(/Ablaufdatum|bis wann/);
  });

  it("abgelaufenes oder bald ablaufendes Secret", () => {
    expect(graphOkResult({ ...t, secretExpiresAt: "2026-11-01" }, [], now)).toMatchObject({ ok: false, problem: "secret-expired" });
    expect(graphOkResult({ ...t, secretExpiresAt: "2026-12-10" }, [], now)).toMatchObject({ ok: true, secretExpiresSoon: true });
  });
});

describe("Ablauf des Secrets", () => {
  it("Tage bis zum Ablauf", () => {
    expect(secretExpiry("", now)).toEqual({ status: "unknown" });
    expect(secretExpiry("2026-11-27", now)).toMatchObject({ status: "soon", days: 0 });
    expect(secretExpiry("2026-11-26", now)).toMatchObject({ status: "expired", days: -1 });
    expect(secretExpiry("2027-06-01", now)).toMatchObject({ status: "ok" });
    expect(secretExpiryHint("2026-11-28", now)).toMatch(/morgen ab \(28\.11\.2026\)/);
    expect(secretExpiryHint("2027-06-01", now)).toBeUndefined();
  });
});

describe("Eingaben prüfen", () => {
  const base = { transport: "microsoft365" as const, tenantId: "kunde.onmicrosoft.com", clientId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", sender: "anfragen@kunde.de", secretExpiresAt: "2027-06-01" };
  it("gültig, leere Felder werden null", () => {
    expect(validateMicrosoft365Input(base, now)).toEqual({ ok: true, value: { mail_transport: "microsoft365", ms_tenant_id: "kunde.onmicrosoft.com", ms_client_id: base.clientId, ms_sender: "anfragen@kunde.de", ms_secret_expires_at: "2027-06-01" } });
    expect(validateMicrosoft365Input({ transport: "smtp", tenantId: "", clientId: "", sender: "", secretExpiresAt: "" }, now)).toMatchObject({ ok: true, value: { mail_transport: "smtp", ms_tenant_id: null } });
  });
  it("falsche Formate und Secret länger als 24 Monate", () => {
    expect(validateMicrosoft365Input({ ...base, tenantId: "https://evil" }, now).ok).toBe(false);
    expect(validateMicrosoft365Input({ ...base, clientId: "123" }, now).ok).toBe(false);
    expect(validateMicrosoft365Input({ ...base, sender: "kein-postfach" }, now).ok).toBe(false);
    expect(validateMicrosoft365Input({ ...base, secretExpiresAt: "2030-01-01" }, now)).toMatchObject({ ok: false, error: expect.stringMatching(/24 Monate/) });
  });
});

describe("Einstellungen mit Versandart Microsoft 365", () => {
  const row = {
    smtp_host: null,
    smtp_port: null,
    smtp_user: null,
    smtp_pass: null,
    smtp_from_name: "Website",
    smtp_from_email: null,
    smtp_recipient: "info@kunde.de",
    mail_transport: "microsoft365",
    ms_tenant_id: "kunde.onmicrosoft.com",
    ms_client_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    ms_client_secret: "verschluesselt",
    ms_sender: "anfragen@kunde.de",
    ms_secret_expires_at: "2027-06-01",
  };
  const dec = () => "secret-klartext";

  it("vollständig: Konfiguration mit Postfach als Absender, Secret nie in den Formularwerten", () => {
    const r = evaluateSmtpRow(row, dec);
    expect(r.missing).toEqual([]);
    expect(r.config).toMatchObject({ transport: "microsoft365", clientSecret: "secret-klartext", sender: "anfragen@kunde.de", fromEmail: "anfragen@kunde.de", recipient: "info@kunde.de" });
    expect(r.values).toMatchObject({ transport: "microsoft365", msSecretStatus: "saved", msAvailable: true });
    expect(JSON.stringify(r.values)).not.toContain("secret-klartext");
  });

  it("fehlende Angaben und unlesbares Secret", () => {
    expect(evaluateSmtpRow({ ...row, ms_tenant_id: null, ms_sender: null }, dec).missing).toEqual(["Tenant-ID", "Absender-Postfach"]);
    const r = evaluateSmtpRow(row, () => {
      throw new Error("ENCRYPTION_KEY");
    });
    expect(r.config).toBeNull();
    expect(r.missing).toEqual(["lesbares Client-Secret (bitte neu eingeben)"]);
  });

  it("ohne die Spalten aus 0.19.0 bleibt alles SMTP", () => {
    const { mail_transport: _a, ms_tenant_id: _b, ms_client_id: _c, ms_client_secret: _d, ms_sender: _e, ms_secret_expires_at: _f, ...old } = row;
    const r = evaluateSmtpRow(old, dec);
    expect(r.values).toMatchObject({ transport: "smtp", msAvailable: false });
    expect(r.missing).toContain("Server");
  });

  it("SMTP gewählt: Microsoft-Angaben bleiben gespeichert, werden aber nicht entschlüsselt", () => {
    let calls = 0;
    const r = evaluateSmtpRow({ ...row, mail_transport: "smtp" }, () => {
      calls++;
      return "x";
    });
    expect(r.values.transport).toBe("smtp");
    expect(r.values.msSecretStatus).toBe("saved");
    expect(calls).toBe(0);
  });
});

describe("checkGraph (nachgebautes fetch)", () => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const cfg = (f: typeof fetch) => ({ tenantId: "kunde.onmicrosoft.com", clientId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", clientSecret: `s-${Math.random()}`, sender: "anfragen@kunde.de", fetch: f });

  it("Token da: Ergebnis ok, sendet nichts", async () => {
    const urls: string[] = [];
    const f = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ access_token: `${b64({})}.${b64({ roles: ["Mail.Send"] })}.x`, expires_in: 3600 }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await checkGraph(cfg(f));
    expect(r).toMatchObject({ ok: true, transport: "microsoft365" });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/login\.microsoftonline\.com/);
  });

  it("falsches Secret: Erklärung statt Fehler", async () => {
    const f = (async () => new Response(JSON.stringify({ error: "invalid_client", error_description: "AADSTS7000215: Invalid client secret provided.", error_codes: [7000215] }), { status: 401 })) as unknown as typeof fetch;
    const r = await checkGraph(cfg(f));
    expect(r).toMatchObject({ ok: false, problem: "auth", steps: { encryption: "fail" } });
  });
});
