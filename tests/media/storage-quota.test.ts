import { describe, expect, it } from "vitest";
import {
  KONTINGENT_URL,
  kontingentAbfrageUrl,
  kontingentAusAntwort,
  parseQuotaGb,
  storageStatus,
} from "../../src/media/storage-quota";

describe("kontingentAbfrageUrl", () => {
  it("fragt mit Repo-Namen und Domain beim Kundenregister", () => {
    const url = new URL(kontingentAbfrageUrl({ VERCEL_GIT_REPO_SLUG: "beispiel", VERCEL_PROJECT_PRODUCTION_URL: "www.beispiel.de" })!);
    expect(url.origin + url.pathname).toBe(KONTINGENT_URL);
    expect(url.searchParams.get("repo")).toBe("beispiel");
    expect(url.searchParams.get("host")).toBe("www.beispiel.de");
  });

  it("nimmt eine eigene Adresse aus CORE_KONTINGENT_URL", () => {
    expect(kontingentAbfrageUrl({ VERCEL_GIT_REPO_SLUG: "x", CORE_KONTINGENT_URL: "http://localhost:3010/api/kontingent" }))
      .toBe("http://localhost:3010/api/kontingent?repo=x");
  });

  it("fragt nicht, wenn weder Repo noch Domain bekannt sind (z. B. lokal)", () => {
    expect(kontingentAbfrageUrl({})).toBeNull();
  });
});

describe("kontingentAusAntwort", () => {
  it("liest die Zahl aus der Antwort, sonst null", () => {
    expect(kontingentAusAntwort({ kontingentGb: 10 })).toBe(10 * 1024 * 1024 * 1024);
    expect(kontingentAusAntwort({ kontingentGb: null })).toBeNull();
    expect(kontingentAusAntwort({})).toBeNull();
    expect(kontingentAusAntwort(null)).toBeNull();
  });
});

const GB = 1024 * 1024 * 1024;

describe("parseQuotaGb", () => {
  it("liest ganze Zahlen, Kommazahlen und eine GB-Endung", () => {
    expect(parseQuotaGb("10")).toBe(10 * GB);
    expect(parseQuotaGb("2,5")).toBe(Math.round(2.5 * GB));
    expect(parseQuotaGb(" 25 GB ")).toBe(25 * GB);
  });

  it("gibt bei leeren oder ungültigen Werten null zurück", () => {
    expect(parseQuotaGb(undefined)).toBeNull();
    expect(parseQuotaGb("")).toBeNull();
    expect(parseQuotaGb("abc")).toBeNull();
    expect(parseQuotaGb("0")).toBeNull();
    expect(parseQuotaGb("-5")).toBeNull();
  });
});

describe("storageStatus", () => {
  it("ohne Kontingent kein Anteil und keine Warnung", () => {
    expect(storageStatus(50 * GB, null)).toEqual({ ratio: null, state: "ok" });
  });

  it("warnt ab 80 % und meldet ab 100 % voll", () => {
    expect(storageStatus(7 * GB, 10 * GB).state).toBe("ok");
    expect(storageStatus(8 * GB, 10 * GB).state).toBe("warn");
    expect(storageStatus(10 * GB, 10 * GB).state).toBe("full");
    expect(storageStatus(12 * GB, 10 * GB).ratio).toBeCloseTo(1.2);
  });
});
