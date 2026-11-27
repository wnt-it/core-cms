import { describe, expect, it } from "vitest";
import {
  CONSENT_LIFETIME_MS,
  STORAGE_KEY,
  actionFor,
  allChoices,
  bannerVisible,
  buildStored,
  decisionKey,
  isLegalPath,
  resolveState,
  stableStringify,
  validateEvent,
  withdrawnServices,
} from "../../src/consent/logic";
import { CONSENT_CATALOG } from "../../src/consent/catalog";

const maps = CONSENT_CATALOG["google-maps"];
const yt = CONSENT_CATALOG["youtube"];
const services = [maps, yt];
const NOW = 1_800_000_000_000;

describe("Speicher und Ablauf", () => {
  it("ohne Eintrag ist nichts entschieden", () => {
    expect(resolveState(null, services, NOW)).toEqual({ choices: {}, undecided: ["google-maps", "youtube"] });
  });

  it("liest eine gültige Entscheidung, auch die Ablehnung", () => {
    const raw = JSON.stringify(buildStored({ "google-maps": true, youtube: false }, services, NOW));
    const s = resolveState(raw, services, NOW + 1000);
    expect(s.choices).toEqual({ "google-maps": true, youtube: false });
    expect(s.undecided).toEqual([]);
  });

  it("nach 12 Monaten wird neu gefragt", () => {
    const raw = JSON.stringify(buildStored({ "google-maps": true, youtube: true }, services, NOW));
    expect(resolveState(raw, services, NOW + CONSENT_LIFETIME_MS - 1).undecided).toEqual([]);
    expect(resolveState(raw, services, NOW + CONSENT_LIFETIME_MS + 1).undecided).toEqual(["google-maps", "youtube"]);
  });

  it("kaputte, unbekannte oder neuere Formate gelten nie als Zustimmung", () => {
    const bad = [
      "{kaputt",
      "null",
      "[]",
      JSON.stringify({ v: 2, exp: NOW + 1e9, c: { "google-maps": true }, k: {} }),
      JSON.stringify({ v: 1, exp: NOW + 1e9 }),
    ];
    for (const raw of bad) {
      const s = resolveState(raw, services, NOW);
      expect(s.choices).toEqual({});
      expect(s.undecided).toHaveLength(2);
    }
  });

  it("nur Booleans zählen, Text wie 'true' ist keine Zustimmung", () => {
    const raw = JSON.stringify({ v: 1, at: NOW, exp: NOW + 1e9, c: { "google-maps": "true" }, k: { "google-maps": decisionKey(maps) } });
    expect(resolveState(raw, services, NOW).choices).toEqual({});
  });

  it("eine wesentliche Änderung (revision) fragt nur diesen Dienst neu", () => {
    const raw = JSON.stringify(buildStored({ "google-maps": true, youtube: true }, services, NOW));
    const changed = [{ ...maps, revision: 2 }, yt];
    const s = resolveState(raw, changed, NOW);
    expect(s.undecided).toEqual(["google-maps"]);
    expect(s.choices).toEqual({ youtube: true });
  });

  it("ein neuer Dienst wird gefragt, alte Entscheidungen bleiben", () => {
    const raw = JSON.stringify(buildStored({ "google-maps": false }, [maps], NOW));
    const s = resolveState(raw, services, NOW);
    expect(s.choices).toEqual({ "google-maps": false });
    expect(s.undecided).toEqual(["youtube"]);
  });

  it("speichert nur Dienste der aktuellen Konfiguration", () => {
    const stored = buildStored({ "google-maps": true, fremd: true }, services, NOW);
    expect(Object.keys(stored.c)).toEqual(["google-maps"]);
    expect(stored.exp).toBe(NOW + CONSENT_LIFETIME_MS);
  });

  it("speichert weder ID noch Kennung", () => {
    const stored = buildStored(allChoices(services, true), services, NOW);
    expect(Object.keys(stored).sort()).toEqual(["at", "c", "exp", "k", "v"]);
    expect(STORAGE_KEY).toBe("cms_consent");
  });
});

describe("Widerruf und Aktion", () => {
  it("erkennt widerrufene Dienste", () => {
    expect(withdrawnServices({ a: true, b: true, c: false }, { a: false, b: true, c: false })).toEqual(["a"]);
    expect(withdrawnServices({ a: true }, {})).toEqual(["a"]);
    expect(withdrawnServices({ a: false }, { a: true })).toEqual([]);
  });

  it("bestimmt die Aktion", () => {
    expect(actionFor({ "google-maps": true, youtube: true }, services)).toBe("accept_all");
    expect(actionFor({ "google-maps": false, youtube: false }, services)).toBe("reject_all");
    expect(actionFor({ "google-maps": true, youtube: false }, services)).toBe("custom");
    expect(actionFor({}, services)).toBe("reject_all");
  });
});

describe("Banner-Sichtbarkeit", () => {
  const legal = ["/datenschutz", "/impressum"];
  it("nur im Modus banner und solange etwas offen ist", () => {
    expect(bannerVisible("banner", ["a"], "/", legal)).toBe(true);
    expect(bannerVisible("einbettung", ["a"], "/", legal)).toBe(false);
    expect(bannerVisible("aus", ["a"], "/", legal)).toBe(false);
    expect(bannerVisible("banner", [], "/", legal)).toBe(false);
  });
  it("nie auf Datenschutz und Impressum (auch mit Schrägstrich am Ende)", () => {
    expect(bannerVisible("banner", ["a"], "/datenschutz", legal)).toBe(false);
    expect(bannerVisible("banner", ["a"], "/impressum/", legal)).toBe(false);
    expect(isLegalPath("/datenschutz-info", legal)).toBe(false);
  });
});

describe("Prüfung eingehender Ereignisse", () => {
  const ok = { action: "custom", trigger: "settings", choices: { "google-maps": true, youtube: false }, pagePath: "/kontakt?x=1#a" };
  it("nimmt gültige Ereignisse an und kürzt den Pfad auf den reinen Pfad", () => {
    const r = validateEvent(ok, services);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.pagePath).toBe("/kontakt");
  });
  it("lehnt Fehlerhaftes ab", () => {
    const bad = [
      null,
      "text",
      { ...ok, action: "hack" },
      { ...ok, trigger: "x" },
      { ...ok, choices: null },
      { ...ok, choices: [] },
      { ...ok, choices: {} },
      { ...ok, choices: { "google-maps": "ja" } },
      { ...ok, choices: { unbekannt: true } },
    ];
    for (const b of bad) expect(validateEvent(b, services).ok).toBe(false);
  });
  it("verwirft Pfade, die nicht mit / beginnen", () => {
    const r = validateEvent({ ...ok, pagePath: "https://fremd.example/x" }, services);
    expect(r.ok && r.value.pagePath).toBeUndefined();
  });
  it("übernimmt keine zusätzlichen Felder (z. B. IDs)", () => {
    const r = validateEvent({ ...ok, consentId: "abc", ip: "1.2.3.4" }, services);
    expect(r.ok && Object.keys(r.value).sort()).toEqual(["action", "choices", "pagePath", "trigger"]);
  });
});

describe("stableStringify", () => {
  it("ist unabhängig von der Reihenfolge der Schlüssel", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
});
