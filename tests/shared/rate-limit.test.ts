import { describe, expect, it } from "vitest";
import { createRateLimiter, ipFromHeaders } from "../../src/shared/rate-limit";

describe("Begrenzung je Absender", () => {
  it("sperrt nach max Versuchen im Zeitfenster und gibt danach wieder frei", () => {
    const l = createRateLimiter({ windowMs: 1000, max: 2 });
    expect(l.hit("a", 0)).toBe(false);
    expect(l.hit("a", 10)).toBe(false);
    expect(l.hit("a", 20)).toBe(true);
    expect(l.hit("b", 20)).toBe(false);
    expect(l.hit("a", 2000)).toBe(false);
  });

  it("liest die erste Adresse aus x-forwarded-for", () => {
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(ipFromHeaders(new Headers())).toBe("unbekannt");
  });
});
