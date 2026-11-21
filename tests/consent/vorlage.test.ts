import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseVorlageText } from "../../src/legal/templates/vorlage-text";

// Die Datenschutz-Vorlage wird von allen Projekten live gelesen. Eine ungültige Datei wird dort abgelehnt (dann gilt die mitgelieferte Fassung).
describe("Datenschutz-Vorlage (Cookie-Abschnitt passt zum Einwilligungs-Feature)", () => {
  const raw = JSON.parse(readFileSync("src/legal/templates/datenschutz-vorlage.json", "utf8"));
  it("wird von der Prüfung der Projekte akzeptiert", () => {
    expect(parseVorlageText(raw)).not.toBeNull();
  });
  it("beschreibt Speicherung, Protokoll ohne IP und Aufbewahrung, und behauptet nicht mehr, die Auswahl bleibe beim Besucher", () => {
    const text = raw.blocks.map((b: { text: string }) => b.text).join("\n");
    expect(text).toContain("cms_consent");
    expect(text).toMatch(/protokollieren wir jede Entscheidung/);
    expect(text).toMatch(/weder Ihre IP-Adresse noch Ihren Namen/);
    expect(text).not.toContain("Die Auswahl wird nicht an uns übertragen");
  });
});

describe("Datenschutz: Cookie-Abschnitt abwählbar, Telefon optional", async () => {
  const { buildDatenschutz, normalizeDatenschutzConfig } = await import("../../src/legal/templates/datenschutz");
  const titel = (doc: { blocks: { t: string; text: string }[] }) => doc.blocks.filter((b) => b.t !== "p" && b.t !== "li").map((b) => b.text);
  const alles = (doc: { blocks: { text: string }[] }) => doc.blocks.map((b) => b.text).join("\n");

  it("enthält den Cookie-Abschnitt standardmäßig, auch bei älteren Einstellungen ohne Angabe", () => {
    expect(normalizeDatenschutzConfig({}).cookies).toBe(true);
    expect(titel(buildDatenschutz({})).some((t) => t.includes("Cookies und Einwilligungsmanagement"))).toBe(true);
  });
  it("lässt den ganzen Cookie-Abschnitt weg, der nächste Abschnitt bleibt", () => {
    const doc = buildDatenschutz(normalizeDatenschutzConfig({ cookies: false }));
    expect(titel(doc).some((t) => t.includes("Cookies"))).toBe(false);
    expect(alles(doc)).not.toContain("cms_consent");
    expect(titel(doc).some((t) => t.includes("Kontaktformular und Anfragen"))).toBe(true);
  });
  it("zeigt ohne Telefonnummer keine Telefonzeile und keinen Platzhalter", () => {
    expect(alles(buildDatenschutz({}))).not.toMatch(/Telefon:/);
    expect(alles(buildDatenschutz({ telefon: "0711 123" }))).toContain("Telefon: 0711 123");
  });
});

describe("Datenschutz: Kontaktformular abwählbar", async () => {
  const { buildDatenschutz, normalizeDatenschutzConfig } = await import("../../src/legal/templates/datenschutz");
  const { countBrokenRefs } = await import("../../src/legal/policy");
  const alles = (doc: { blocks: { text: string }[] }) => doc.blocks.map((b) => b.text).join("\n");

  it("ist standardmäßig an", () => {
    expect(normalizeDatenschutzConfig({}).kontaktformular).toBe(true);
    expect(alles(buildDatenschutz({}))).toContain("Kontaktformular und Anfragen");
  });
  it("entfernt Abschnitt und Verweise darauf, ohne kaputte Verweise oder leere Klammern", () => {
    const doc = buildDatenschutz(normalizeDatenschutzConfig({ kontaktformular: false }));
    const text = alles(doc);
    expect(text).not.toContain("Kontaktformular und Anfragen");
    expect(text).not.toContain("{{ref:kontaktformulare}}");
    expect(text).not.toMatch(/\(\s*\)|\s\./);
    expect(countBrokenRefs(doc.blocks)).toBe(0);
    expect(text).toContain("Die E-Mails werden gelöscht, sobald Ihr Anliegen abschließend bearbeitet ist.");
    expect(text).toContain("Ihre Rechte");
  });
  it("beides aus: Text bleibt gültig", () => {
    const doc = buildDatenschutz(normalizeDatenschutzConfig({ kontaktformular: false, cookies: false }));
    expect(countBrokenRefs(doc.blocks)).toBe(0);
  });
});
