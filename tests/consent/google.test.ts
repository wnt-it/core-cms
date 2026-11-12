// Google Consent Mode v2: Zuordnung Dienst → Signal, Reihenfolge der Einwilligung, strenge IDs.

import { describe, expect, it } from "vitest";
import { defineConsentConfig, dienst } from "../../src/consent/config";
import {
  DENIED_SIGNALS,
  anyGoogleAllowed,
  bootstrapGoogle,
  cookieDomains,
  googleConfigTargets,
  googleConsentSignals,
  googleScriptUrl,
  storageNameMatches,
  validateGoogleIds,
} from "../../src/consent/google";

const allow = (...ids: string[]) => (id: string) => ids.includes(id);
const args = (entry: unknown) => Array.from(entry as ArrayLike<unknown>);

describe("Katalog: Google-Dienste", () => {
  it("sind Skripte mit Pflichtangaben und erzwingen den Banner", () => {
    const cfg = defineConsentConfig({ dienste: ["google-analytics", "google-ads"] });
    expect(cfg.modus).toBe("banner");
    expect(dienst("google-analytics").kategorie).toBe("statistik");
    expect(dienst("google-ads").kategorie).toBe("marketing");
    for (const id of ["google-analytics", "google-ads"]) {
      const d = dienst(id);
      expect(d.art).toBe("skript");
      expect(d.drittland).toBe(true);
      expect(d.drittlandGrundlage).toBeTruthy();
      expect(d.speicher.length).toBeGreaterThan(0);
    }
  });

  it("lässt sich nicht im Modus einbettung betreiben", () => {
    expect(() => defineConsentConfig({ modus: "einbettung", dienste: ["google-analytics"] })).toThrow(/banner/);
  });
});

describe("googleConsentSignals", () => {
  it("verweigert ohne Entscheidung alles außer security_storage", () => {
    expect(googleConsentSignals(allow())).toEqual(DENIED_SIGNALS);
    expect(DENIED_SIGNALS.security_storage).toBe("granted");
  });

  it("Statistik erlaubt nur analytics_storage", () => {
    const s = googleConsentSignals(allow("google-analytics"));
    expect(s.analytics_storage).toBe("granted");
    expect(s.ad_storage).toBe("denied");
    expect(s.ad_user_data).toBe("denied");
    expect(s.ad_personalization).toBe("denied");
  });

  it("Werbung erlaubt ad_storage und ad_user_data, Personalisierung nur mit remarketing", () => {
    const s = googleConsentSignals(allow("google-ads"));
    expect(s.analytics_storage).toBe("denied");
    expect(s.ad_storage).toBe("granted");
    expect(s.ad_user_data).toBe("granted");
    expect(s.ad_personalization).toBe("denied");
    expect(googleConsentSignals(allow("google-ads"), undefined, { remarketing: true }).ad_personalization).toBe("granted");
  });

  it("nutzt abweichende Dienst-Kennungen", () => {
    const s = googleConsentSignals(allow("ga4"), { analytics: "ga4", ads: "ads" });
    expect(s.analytics_storage).toBe("granted");
    expect(anyGoogleAllowed(allow("ga4"), { analytics: "ga4" })).toBe(true);
    expect(anyGoogleAllowed(allow(), { analytics: "ga4" })).toBe(false);
  });
});

describe("IDs und Skript-Adresse", () => {
  it("akzeptiert nur gültige IDs", () => {
    expect(validateGoogleIds({ gtmId: "GTM-ABC1234" })).toBeNull();
    expect(validateGoogleIds({ gaId: "G-ABCDE12345", adsId: "AW-123456789" })).toBeNull();
    expect(validateGoogleIds({})).toBeNull();
    expect(validateGoogleIds({ gtmId: "GTM-abc" })).toMatch(/Format/);
    expect(validateGoogleIds({ gtmId: "GTM-ABC1234\"><script>" })).toMatch(/Format/);
    expect(validateGoogleIds({ gaId: "UA-1234-1" })).toMatch(/Format/);
    expect(validateGoogleIds({ gtmId: "GTM-ABC1234", gaId: "G-ABCDE12345" })).toMatch(/nicht beides/);
  });

  it("baut genau eine Adresse bei googletagmanager.com", () => {
    expect(googleScriptUrl({ gtmId: "GTM-ABC1234" })).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234");
    expect(googleScriptUrl({ gaId: "G-ABCDE12345" })).toBe("https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345");
    expect(googleScriptUrl({ adsId: "AW-123456789" })).toBe("https://www.googletagmanager.com/gtag/js?id=AW-123456789");
    expect(googleScriptUrl({})).toBeNull();
    expect(googleScriptUrl({ gtmId: "kaputt" })).toBeNull();
  });
});

describe("bootstrapGoogle", () => {
  it("schreibt erst default (alles verweigert), dann update, dann den Tag-Manager-Start", () => {
    const w: { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } = {};
    const signals = googleConsentSignals(allow("google-analytics"));
    bootstrapGoogle(w, { gtmId: "GTM-ABC1234" }, signals);
    const dl = w.dataLayer!;
    expect(args(dl[0]).slice(0, 2)).toEqual(["consent", "default"]);
    expect(args(dl[0])[2]).toMatchObject({ ...DENIED_SIGNALS, wait_for_update: 500 });
    const updateIndex = dl.findIndex((e) => args(e)[0] === "consent" && args(e)[1] === "update");
    expect(updateIndex).toBeGreaterThan(0);
    expect(args(dl[updateIndex])[2]).toEqual(signals);
    expect(dl.some((e) => args(e)[0] === "set" && args(e)[1] === "ads_data_redaction" && args(e)[2] === true)).toBe(true);
    const start = dl.findIndex((e) => (e as { event?: string }).event === "gtm.js");
    expect(start).toBeGreaterThan(updateIndex);
  });

  it("richtet bei gtag.js nur die erlaubten Konten ein", () => {
    const ids = { gaId: "G-ABCDE12345", adsId: "AW-123456789" };
    expect(googleConfigTargets(ids, googleConsentSignals(allow("google-analytics")))).toEqual(["G-ABCDE12345"]);
    expect(googleConfigTargets(ids, googleConsentSignals(allow("google-ads")))).toEqual(["AW-123456789"]);
    expect(googleConfigTargets(ids, googleConsentSignals(allow("google-analytics", "google-ads")))).toEqual(["G-ABCDE12345", "AW-123456789"]);
    expect(googleConfigTargets({ gtmId: "GTM-ABC1234" }, googleConsentSignals(allow("google-ads")))).toEqual([]);

    const w: { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } = {};
    bootstrapGoogle(w, ids, googleConsentSignals(allow("google-ads")));
    const configs = w.dataLayer!.filter((e) => args(e)[0] === "config").map((e) => args(e)[1]);
    expect(configs).toEqual(["AW-123456789"]);
  });
});

describe("Aufräumen beim Widerruf", () => {
  it("erkennt Platzhalter in Speicher-Namen", () => {
    expect(storageNameMatches("_ga_*", "_ga_ABC123")).toBe(true);
    expect(storageNameMatches("_ga_*", "_ga")).toBe(false);
    expect(storageNameMatches("_ga", "_ga")).toBe(true);
    expect(storageNameMatches("_ga", "_gat")).toBe(false);
  });

  it("löscht auf Host und Hauptdomain, bei localhost und IP nur ohne Domain", () => {
    expect(cookieDomains("www.dago-consulting.de")).toEqual(["", "www.dago-consulting.de", ".www.dago-consulting.de", ".dago-consulting.de"]);
    expect(cookieDomains("localhost")).toEqual([""]);
    expect(cookieDomains("127.0.0.1")).toEqual([""]);
  });
});
