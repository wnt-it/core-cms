// Empfänger je Formular: Eine Anfrage darf nie wegen eines falschen Eintrags verloren gehen.
import { describe, expect, it } from "vitest";
import {
  formGroup,
  listFormTypes,
  normalizeFormRecipients,
  parseRecipientList,
  recipientFor,
  validateFormRecipients,
} from "../../src/email/form-recipients";

describe("Empfänger je Formular", () => {
  const map = {
    "Kontakt · Abteilung Nord": "nord@example.org",
    Kontakt: "kontakt@example.org",
    Bewerbung: "personal@example.org, chef@example.org",
  };

  it("genaue Formular-Art vor Gruppe vor allgemeinem Empfänger", () => {
    expect(recipientFor("Kontakt · Abteilung Nord", map, "info@example.org")).toBe("nord@example.org");
    expect(recipientFor("Kontakt · Abteilung Süd", map, "info@example.org")).toBe("kontakt@example.org");
    expect(recipientFor("Bewerbung", map, "info@example.org")).toBe("personal@example.org, chef@example.org");
    expect(recipientFor("Newsletter", map, "info@example.org")).toBe("info@example.org");
    expect(recipientFor("", {}, "info@example.org")).toBe("info@example.org");
  });

  it("Gruppe ist der Teil vor „ · “", () => {
    expect(formGroup("Kontakt · Richard Prinz")).toBe("Kontakt");
    expect(formGroup("Bewerbung")).toBe("Bewerbung");
  });

  it("Adresslisten: Komma, Semikolon, Zeilen; doppelte und Großschreibung zusammengefasst", () => {
    expect(parseRecipientList("A@x.de; b@x.de,\n a@x.de")).toEqual({ ok: true, list: ["a@x.de", "b@x.de"] });
    expect(parseRecipientList("")).toEqual({ ok: true, list: [] });
    const bad = parseRecipientList("info@x.de, kein-at");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("kein-at");
    expect(parseRecipientList(Array.from({ length: 11 }, (_, i) => `a${i}@x.de`).join(",")).ok).toBe(false);
  });

  it("Eingaben aus dem Admin: leere Zeilen fallen weg, Fehler nennt das Formular", () => {
    expect(validateFormRecipients({ Kontakt: " a@x.de ", Bewerbung: "", Leer: "   " })).toEqual({ ok: true, value: { Kontakt: "a@x.de" } });
    const r = validateFormRecipients({ Bewerbung: "personal(at)x.de" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Bewerbung");
  });

  it("gespeicherte Werte: Ungültiges wird ignoriert statt den Versand zu stören", () => {
    expect(normalizeFormRecipients({ Kontakt: "a@x.de", Kaputt: "nix", Zahl: 5 })).toEqual({ Kontakt: "a@x.de" });
    expect(normalizeFormRecipients(null)).toEqual({});
    expect(normalizeFormRecipients(["a@x.de"])).toEqual({});
  });

  it("Formular-Liste: alle Quellen, ohne Doppelte, alphabetisch", () => {
    expect(listFormTypes(["Kontakt · Süd", null, ""], ["Bewerbung", "Kontakt · Süd"], [" Anfrage "])).toEqual([
      "Anfrage",
      "Bewerbung",
      "Kontakt · Süd",
    ]);
  });
});
