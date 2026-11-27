// Versandart „Microsoft 365“: Token (Client Credentials) und Graph sendMail, mit nachgebautem fetch.
// Kein echter Tenant: Die Antworten unten entsprechen dem dokumentierten Format von Microsoft.
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphEmailProvider, GraphMailError, buildGraphMessage, clearGraphTokenCache, fetchGraphToken, isValidTenantId, rolesFromToken } from "../../src/email/graph-provider";

const TENANT = "11111111-2222-3333-4444-555555555555";
const CLIENT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Access Token wie von Microsoft (JWT), nur der Inhalt zählt. */
function jwt(payload: Record<string, unknown>) {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "RS256", typ: "JWT" })}.${b(payload)}.signatur`;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function fakeFetch(...responses: Array<Response | Error>) {
  const f = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const r = responses.shift();
    if (!r) throw new Error("keine Antwort mehr vorbereitet");
    if (r instanceof Error) throw r;
    return r;
  });
  return f;
}

const tokenOk = (roles: string[] = ["Mail.Send"]) => json(200, { token_type: "Bearer", expires_in: 3599, access_token: jwt({ roles, tid: TENANT }) });

const config = (f: ReturnType<typeof fakeFetch>) => ({ tenantId: TENANT, clientId: CLIENT, clientSecret: "geheim~wert", sender: "anfragen@kunde.de", fetch: f as unknown as typeof fetch });

afterEach(() => clearGraphTokenCache());

describe("Token holen", () => {
  it("fragt den Tenant mit Client Credentials und dem Graph-Scope an", async () => {
    const f = fakeFetch(tokenOk());
    const t = await fetchGraphToken(config(f));
    expect(t.roles).toEqual(["Mail.Send"]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`);
    expect(init?.method).toBe("POST");
    const body = new URLSearchParams(String(init?.body));
    expect(Object.fromEntries(body)).toEqual({ client_id: CLIENT, client_secret: "geheim~wert", scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
  });

  it("merkt sich das Token, holt mit fresh neu", async () => {
    const f = fakeFetch(tokenOk(), tokenOk());
    await fetchGraphToken(config(f));
    await fetchGraphToken(config(f));
    expect(f).toHaveBeenCalledTimes(1);
    await fetchGraphToken(config(f), { fresh: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("Fehler von Microsoft mit AADSTS-Nummer", async () => {
    const f = fakeFetch(json(401, { error: "invalid_client", error_description: "AADSTS7000215: Invalid client secret provided.\r\nTrace ID: x", error_codes: [7000215] }));
    const err = await fetchGraphToken(config(f)).catch((e) => e);
    expect(err).toBeInstanceOf(GraphMailError);
    expect(err).toMatchObject({ stage: "token", status: 401, code: "invalid_client", aadsts: [7000215] });
    expect(err.message).toBe("AADSTS7000215: Invalid client secret provided.");
  });

  it("ungültige Tenant-ID geht gar nicht erst raus", async () => {
    const f = fakeFetch();
    const err = await fetchGraphToken({ ...config(f), tenantId: "x/../evil" }).catch((e) => e);
    expect(err).toMatchObject({ stage: "token", code: "invalid_tenant_format" });
    expect(f).not.toHaveBeenCalled();
  });

  it("Netzwerkfehler und Zeitüberschreitung", async () => {
    const e1 = await fetchGraphToken(config(fakeFetch(Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } })))).catch((e) => e);
    expect(e1).toMatchObject({ code: "network" });
    const e2 = await fetchGraphToken(config(fakeFetch(Object.assign(new Error("aborted"), { name: "TimeoutError" })))).catch((e) => e);
    expect(e2).toMatchObject({ code: "timeout" });
  });
});

describe("Senden über Graph", () => {
  it("POST /users/{absender}/sendMail mit Bearer-Token und HTML-Nachricht", async () => {
    const f = fakeFetch(tokenOk(), new Response(null, { status: 202 }));
    await new GraphEmailProvider(config(f)).send({
      to: "info@kunde.de, vertrieb@kunde.de",
      subject: "Neue Anfrage\r\nBcc: x@y.de",
      html: "<p>Hallo</p>",
      fromName: "Website",
      fromEmail: "anfragen@kunde.de",
      replyTo: { name: "Erika <Muster>", email: "erika@example.com" },
    });
    const [url, init] = f.mock.calls[1];
    expect(url).toBe("https://graph.microsoft.com/v1.0/users/anfragen%40kunde.de/sendMail");
    expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Bearer ey/);
    const body = JSON.parse(String(init?.body));
    expect(body.message.toRecipients).toEqual([{ emailAddress: { address: "info@kunde.de" } }, { emailAddress: { address: "vertrieb@kunde.de" } }]);
    expect(body.message.subject).toBe("Neue Anfrage Bcc: x@y.de");
    expect(body.message.body).toEqual({ contentType: "HTML", content: "<p>Hallo</p>" });
    expect(body.message.from).toEqual({ emailAddress: { address: "anfragen@kunde.de", name: "Website" } });
    expect(body.message.replyTo).toEqual([{ emailAddress: { address: "erika@example.com", name: "Erika Muster" } }]);
    expect(body.saveToSentItems).toBe(true);
  });

  it("sendet immer aus dem Absender-Postfach, auch wenn fromEmail abweicht", () => {
    const m = buildGraphMessage({ to: "a@b.de", subject: "x", html: "", fromEmail: "andere@x.de" }, "postfach@kunde.de");
    expect(m.message.from.emailAddress.address).toBe("postfach@kunde.de");
  });

  it("403 von Graph wird als GraphMailError (send) gemeldet", async () => {
    const f = fakeFetch(tokenOk([]), json(403, { error: { code: "ErrorAccessDenied", message: "Access is denied. Check credentials and try again." } }));
    const err = await new GraphEmailProvider(config(f)).send({ to: "a@b.de", subject: "x", html: "" }).catch((e) => e);
    expect(err).toMatchObject({ stage: "send", status: 403, code: "ErrorAccessDenied" });
  });

  it("401 beim Senden verwirft das gemerkte Token", async () => {
    const f = fakeFetch(tokenOk(), json(401, { error: { code: "InvalidAuthenticationToken", message: "expired" } }), tokenOk(), new Response(null, { status: 202 }));
    const p = new GraphEmailProvider(config(f));
    await expect(p.send({ to: "a@b.de", subject: "x", html: "" })).rejects.toBeInstanceOf(GraphMailError);
    await p.send({ to: "a@b.de", subject: "x", html: "" });
    expect(f).toHaveBeenCalledTimes(4);
  });
});

describe("Hilfsfunktionen", () => {
  it("Tenant-ID: GUID oder Domain", () => {
    expect(isValidTenantId(TENANT)).toBe(true);
    expect(isValidTenantId("kunde.onmicrosoft.com")).toBe(true);
    expect(isValidTenantId("kunde")).toBe(false);
    expect(isValidTenantId("a/b.de")).toBe(false);
  });

  it("Rollen aus dem Token, kaputtes Token ergibt keine", () => {
    expect(rolesFromToken(jwt({ roles: ["Mail.Send", "User.Read.All"] }))).toEqual(["Mail.Send", "User.Read.All"]);
    expect(rolesFromToken(jwt({}))).toEqual([]);
    expect(rolesFromToken("kein-jwt")).toEqual([]);
  });
});
