// Eine Prüfung für Test-E-Mail und echten Versand; das Passwort bleibt auf dem Server.
import { describe, expect, it } from "vitest";
import { evaluateSmtpRow } from "../../src/email/smtp-settings";

const row = {
  smtp_host: "smtp.example.org",
  smtp_port: "587",
  smtp_user: "info@example.org",
  smtp_pass: "verschluesselt",
  smtp_from_name: "Website",
  smtp_from_email: "noreply@example.org",
  smtp_recipient: "info@example.org",
};
const ok = () => "geheim";

describe("SMTP-Einstellungen", () => {
  it("vollständig: Konfiguration mit Empfänger, Formularwerte ohne Passwort", () => {
    const r = evaluateSmtpRow(row, ok);
    expect(r.missing).toEqual([]);
    expect(r.config).toMatchObject({ host: "smtp.example.org", port: 587, pass: "geheim", recipient: "info@example.org" });
    expect(r.values.passStatus).toBe("saved");
    expect(JSON.stringify(r.values)).not.toContain("geheim");
  });

  it("ohne Empfänger keine Konfiguration (auch nicht für die Test-E-Mail)", () => {
    const r = evaluateSmtpRow({ ...row, smtp_recipient: null }, ok);
    expect(r.config).toBeNull();
    expect(r.missing).toEqual(["Empfänger für Anfragen"]);
  });

  it("nicht entschlüsselbares Passwort wird gemeldet", () => {
    const r = evaluateSmtpRow(row, () => {
      throw new Error("ENCRYPTION_KEY");
    });
    expect(r.values.passStatus).toBe("unreadable");
    expect(r.config).toBeNull();
    expect(r.missing[0]).toMatch(/lesbares Passwort/);
  });

  it("ungültiger Port und leere Zeile", () => {
    expect(evaluateSmtpRow({ ...row, smtp_port: "abc" }, ok).missing).toEqual(["Port"]);
    expect(evaluateSmtpRow(null).config).toBeNull();
  });
});
