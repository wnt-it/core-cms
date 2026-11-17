// Verbindungsprüfung zum Mailserver: Fehler werden in Schritt, Problem und Erklärung übersetzt.
import { describe, expect, it } from "vitest";
import { classifySmtpError, incompleteResult, okResult } from "../../src/email/smtp-check-types";
import { buildSmtpTransportOptions } from "../../src/email/smtp-provider";
import { evaluateSmtpRow } from "../../src/email/smtp-settings";

const t = { host: "mail.kunde.de", port: 587 };
const err = (message: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(message), extra);

describe("classifySmtpError", () => {
  it("falscher Servername im Zertifikat nennt die richtigen Namen", () => {
    const r = classifySmtpError(
      err("Error initiating TLS - Hostname/IP does not match certificate's altnames: Host: mail.kunde.de. is not in the cert's altnames: DNS:smtp.ionos.de, DNS:*.smtp.ionos.de", { code: "ETLS" }),
      t,
    );
    expect(r).toMatchObject({ ok: false, problem: "cert-name", steps: { server: "ok", encryption: "fail", login: "skip" } });
    expect(r.certNames).toEqual(["smtp.ionos.de", "*.smtp.ionos.de"]);
    expect(r.hint).toContain("smtp.ionos.de");
  });

  it("abgelaufenes, selbst ausgestelltes und unbekanntes Zertifikat", () => {
    expect(classifySmtpError(err("certificate has expired", { code: "ESOCKET", originalCode: "CERT_HAS_EXPIRED" }), t).problem).toBe("cert-expired");
    expect(classifySmtpError(err("self-signed certificate", { code: "ESOCKET", originalCode: "DEPTH_ZERO_SELF_SIGNED_CERT" }), t).problem).toBe("cert-self-signed");
    expect(classifySmtpError(err("Error initiating TLS - self-signed certificate in certificate chain", { code: "ETLS" }), t).problem).toBe("cert-self-signed");
    expect(classifySmtpError(err("unable to verify the first certificate", { code: "ESOCKET", originalCode: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" }), t).problem).toBe("cert-untrusted");
  });

  it("Server nicht gefunden, abgewiesen, keine Antwort", () => {
    expect(classifySmtpError(err("getaddrinfo ENOTFOUND mail.kunde.de", { code: "EDNS", originalCode: "ENOTFOUND" }), t)).toMatchObject({ problem: "dns", steps: { server: "fail" } });
    expect(classifySmtpError(err("connect ECONNREFUSED 1.2.3.4:587", { code: "ESOCKET", originalCode: "ECONNREFUSED" }), t).problem).toBe("refused");
    expect(classifySmtpError(err("Connection timeout", { code: "ETIMEDOUT" }), t).problem).toBe("timeout");
    expect(classifySmtpError(err("Connection timeout", { code: "ETIMEDOUT" }), { host: "x", port: 25 }).hint).toContain("Port 25");
  });

  it("falscher Port/Verschlüsselung und Server ohne STARTTLS", () => {
    expect(classifySmtpError(err("ssl3_get_record:wrong version number", { code: "ESOCKET" }), t).problem).toBe("tls-mode");
    expect(classifySmtpError(err("Error upgrading connection with STARTTLS: 454 TLS not available", { code: "ETLS" }), t)).toMatchObject({ problem: "no-tls", steps: { encryption: "fail" } });
  });

  it("Anmeldung abgelehnt: Server und Verschlüsselung waren in Ordnung", () => {
    const r = classifySmtpError(err("Invalid login: 535 5.7.8 Authentication failed", { code: "EAUTH", responseCode: 535 }), t);
    expect(r).toMatchObject({ problem: "auth", steps: { server: "ok", encryption: "ok", login: "fail" } });
  });

  it("Unbekanntes bleibt erkennbar", () => {
    expect(classifySmtpError(err("irgendwas"), t)).toMatchObject({ ok: false, problem: "other" });
    expect(classifySmtpError(null, t).problem).toBe("other");
  });

  it("Erfolg und unvollständige Angaben", () => {
    expect(okResult(t)).toMatchObject({ ok: true, steps: { server: "ok", encryption: "ok", login: "ok" } });
    expect(okResult({ ...t, skipCertCheck: true })).toMatchObject({ ok: true, certCheckSkipped: true });
    expect(incompleteResult(["Passwort"]).message).toContain("Passwort");
  });
});

describe("Verbindungs-Optionen", () => {
  it("prüft das Zertifikat und verlangt Verschlüsselung", () => {
    const o = buildSmtpTransportOptions({ host: "smtp.x.de", port: 587, user: "u", pass: "p" });
    expect(o).toMatchObject({ secure: false, requireTLS: true, tls: { rejectUnauthorized: true, servername: "smtp.x.de" } });
    expect(buildSmtpTransportOptions({ host: "smtp.x.de", port: 465, user: "u", pass: "p" })).toMatchObject({ secure: true, requireTLS: false });
  });

  it("Ausnahme nur mit Schalter", () => {
    expect(buildSmtpTransportOptions({ host: "h", port: 587, user: "u", pass: "p", skipCertCheck: true }).tls).toMatchObject({ rejectUnauthorized: false });
  });

  it("Schalter aus der Datenbank, ohne Spalte immer prüfen", () => {
    const row = { smtp_host: "h", smtp_port: "587", smtp_user: "u", smtp_pass: "x", smtp_from_name: "", smtp_from_email: "a@b.de", smtp_recipient: "a@b.de" };
    const ok = () => "geheim";
    expect(evaluateSmtpRow(row, ok)).toMatchObject({ values: { skipCertCheck: false, certSwitchAvailable: false }, config: { skipCertCheck: false } });
    expect(evaluateSmtpRow({ ...row, smtp_skip_cert_check: true }, ok)).toMatchObject({ values: { skipCertCheck: true, certSwitchAvailable: true }, config: { skipCertCheck: true } });
  });
});
