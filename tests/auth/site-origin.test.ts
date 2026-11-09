import { describe, expect, it } from "vitest";
import { resolveSiteOrigin } from "../../src/auth/site-origin";

const vercel = { VERCEL_URL: "projekt-abc.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "www.example.org" };

describe("Adresse für Reset-Links", () => {
  it("nimmt NEXT_PUBLIC_SITE_URL, egal welcher Host kommt", () => {
    expect(resolveSiteOrigin("boese.example", "https", { NEXT_PUBLIC_SITE_URL: "https://www.example.org/" })).toBe("https://www.example.org");
  });
  it("lokal bleibt localhost mit http", () => {
    expect(resolveSiteOrigin("localhost:3010", null, vercel)).toBe("http://localhost:3010");
  });
  it("bekannter Vercel-Host bleibt", () => {
    expect(resolveSiteOrigin("projekt-abc.vercel.app", "https", vercel)).toBe("https://projekt-abc.vercel.app");
    expect(resolveSiteOrigin("www.example.org", "https", vercel)).toBe("https://www.example.org");
  });
  it("fremder Host auf Vercel wird zur Produktions-Domain", () => {
    expect(resolveSiteOrigin("angreifer.example", "https", vercel)).toBe("https://www.example.org");
  });
  it("ohne Vercel und Einstellung wie bisher der Host", () => {
    expect(resolveSiteOrigin("kunde.example", "https", {})).toBe("https://kunde.example");
    expect(resolveSiteOrigin("kaputt host/<x>", null, {})).toBe("http://localhost:3000");
  });
});
