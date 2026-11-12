import { describe, expect, it } from "vitest";
import { FORBIDDEN_BUTTON_LABELS, FORBIDDEN_HEADLINES, TEXTS, isForbiddenHeadline } from "../../src/consent/texts";

describe("Überschriften gegen die Liste der FAQ (LfDI BW, B 1.3.7)", () => {
  it("erkennt die verbotenen Überschriften, auch leicht abgewandelt", () => {
    for (const h of FORBIDDEN_HEADLINES) expect(isForbiddenHeadline(h)).toBe(true);
    expect(isForbiddenHeadline("Ihre Privatsphäre ist uns wichtig!")).toBe(true);
    expect(isForbiddenHeadline("Diese Website verwendet Cookies")).toBe(true);
    expect(isForbiddenHeadline("WIR BENÖTIGEN IHRE ZUSTIMMUNG")).toBe(true);
  });
  it("unsere Überschriften stehen nicht auf der Liste", () => {
    for (const h of [TEXTS.bannerHeadline, TEXTS.gateHeadline, TEXTS.dialogHeadline]) expect(isForbiddenHeadline(h)).toBe(false);
  });
});

describe("Beschriftungen", () => {
  it("Hauptbuttons nutzen keine mehrdeutigen Wörter", () => {
    for (const label of [TEXTS.btnAlleZulassen, TEXTS.btnAlleAblehnen, TEXTS.btnEinstellungen, TEXTS.btnSpeichern, TEXTS.btnLaden]) {
      for (const bad of FORBIDDEN_BUTTON_LABELS) expect(label.toLowerCase()).not.toBe(bad.toLowerCase());
    }
  });
  it("vermeidet Fachwörter, die die FAQ als unverständlich nennt", () => {
    const all = Object.values(TEXTS).join(" ").toLowerCase();
    for (const word of ["vendor", "publisher", "prozessor", "consent", "wesentliche dienste", "essenziell"]) expect(all).not.toContain(word);
  });
  it("Freiwilligkeit und Widerruf sind benannt", () => {
    expect(TEXTS.freiwillig).toMatch(/freiwillig/);
    expect(TEXTS.freiwillig).toMatch(/widerrufen/);
  });
});
