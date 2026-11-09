import { describe, expect, it } from "vitest";
import { CONSENT_CATALOG } from "../../src/consent/catalog";
import { defineConsentConfig, dienst } from "../../src/consent/config";
import type { ConsentService } from "../../src/consent/types";

const eigener: ConsentService = {
  id: "analytics-x",
  art: "skript",
  kategorie: "statistik",
  name: "Analytics X",
  anbieter: "X GmbH, Musterstraße 1, 10115 Berlin",
  zweck: "Reichweitenmessung",
  daten: "IP-Adresse",
  drittland: false,
  datenschutzUrl: "https://example.org/datenschutz",
  speicher: [],
  revision: 1,
  rolle: "auftragsverarbeiter",
  geprueftAm: "2026-11-06",
};

describe("defineConsentConfig", () => {
  it("wählt bei reinen Einbettungen den Einbettungs-Modus", () => {
    expect(defineConsentConfig({ dienste: ["google-maps", "youtube"] }).modus).toBe("einbettung");
  });
  it("wählt bei Skripten den Banner-Modus", () => {
    expect(defineConsentConfig({ dienste: [eigener] }).modus).toBe("banner");
  });
  it("ohne Dienste ist der Modus aus", () => {
    expect(defineConsentConfig({ dienste: [] }).modus).toBe("aus");
  });
  it("verweigert einen Banner ohne einwilligungspflichtigen Dienst", () => {
    expect(() => defineConsentConfig({ modus: "banner", dienste: [] })).toThrow(/Banner ohne Einwilligungspflicht/);
  });
  it("Skripte brauchen den Banner-Modus", () => {
    expect(() => defineConsentConfig({ modus: "einbettung", dienste: [eigener] })).toThrow(/skript/);
  });
  it("Modus aus mit Diensten ergibt keinen Sinn", () => {
    expect(() => defineConsentConfig({ modus: "aus", dienste: ["youtube"] })).toThrow();
  });
  it("unbekannter Katalogeintrag und doppelte Dienste werden abgelehnt", () => {
    expect(() => dienst("gibt-es-nicht")).toThrow(/Katalog/);
    expect(() => defineConsentConfig({ dienste: ["youtube", "youtube"] })).toThrow(/doppelt/);
  });
  it("Pflichtangaben werden geprüft", () => {
    expect(() => defineConsentConfig({ dienste: [{ ...eigener, drittland: true }] })).toThrow(/drittlandGrundlage/);
    expect(() => defineConsentConfig({ dienste: [{ ...eigener, anbieter: "" }] })).toThrow(/anbieter/);
    expect(() => defineConsentConfig({ dienste: [{ ...eigener, datenschutzUrl: "http://x" }] })).toThrow(/https/);
    expect(() => defineConsentConfig({ dienste: [{ ...eigener, id: "Groß Schreibung" }] })).toThrow(/Kennung/);
    expect(() => defineConsentConfig({ dienste: [{ ...eigener, geprueftAm: "gestern" }] })).toThrow(/geprueftAm/);
  });
  it("Rechtsseiten und Endpunkt haben sinnvolle Standardwerte", () => {
    const c = defineConsentConfig({ dienste: ["youtube"] });
    expect(c.rechtsseiten).toEqual(["/datenschutz", "/impressum"]);
    expect(c.endpunkt).toBe("/api/consent");
    expect(c.einstellungenButton).toBe("schwebend");
  });
  it("jeder Katalogeintrag ist gültig", () => {
    for (const id of Object.keys(CONSENT_CATALOG)) expect(() => dienst(id)).not.toThrow();
    expect(() => defineConsentConfig({ dienste: Object.keys(CONSENT_CATALOG) })).not.toThrow();
  });
});
