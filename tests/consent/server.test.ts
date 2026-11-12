import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  count: 0,
  failWith: null as string | null,
  upserts: [] as Array<{ table: string; row: Record<string, unknown>; opts: unknown }>,
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
};

vi.mock("../../src/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => ({ gte: async () => ({ count: state.count, error: null }) }),
      upsert: async (row: Record<string, unknown>, opts: unknown) => {
        state.upserts.push({ table, row, opts });
        return { error: state.failWith ? { message: state.failWith } : null };
      },
      insert: async (row: Record<string, unknown>) => {
        state.inserts.push({ table, row });
        return { error: state.failWith ? { message: state.failWith } : null };
      },
    }),
  }),
}));

import { defineConsentConfig, dienst } from "../../src/consent/config";
import { buildSnapshot, createConsentHandler, snapshotHash } from "../../src/consent/server";

const config = defineConsentConfig({ dienste: ["google-maps", "youtube"] });
const post = createConsentHandler(config);

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.org/api/consent", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.org", "x-forwarded-host": "example.org", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const valid = { action: "custom", trigger: "embed", choices: { "google-maps": true }, pagePath: "/kontakt" };

beforeEach(() => {
  state.count = 0;
  state.failWith = null;
  state.upserts = [];
  state.inserts = [];
});

describe("POST /api/consent", () => {
  it("schreibt Textstand und Entscheidung, ohne ID, IP oder Browserkennung", async () => {
    const res = await post(req(valid, { "x-forwarded-for": "203.0.113.5", "user-agent": "Test/1.0" }));
    expect(res.status).toBe(204);
    expect(state.upserts[0].table).toBe("consent_configs");
    expect(state.upserts[0].row.hash).toBe(snapshotHash(config));
    expect(state.inserts).toHaveLength(1);
    const row = state.inserts[0].row;
    expect(Object.keys(row).sort()).toEqual(["action", "choices", "config_hash", "core_version", "page_path", "trigger"]);
    expect(JSON.stringify(row)).not.toMatch(/203\.0\.113|Test\/1\.0/);
    expect(row.page_path).toBe("/kontakt");
  });

  it("lehnt fremde Herkunft ab", async () => {
    const res = await post(req(valid, { origin: "https://boese.example" }));
    expect(res.status).toBe(403);
    expect(state.inserts).toHaveLength(0);
  });

  it("lehnt ungültige und zu große Anfragen ab", async () => {
    expect((await post(req("kein json"))).status).toBe(400);
    expect((await post(req({ ...valid, choices: { unbekannt: true } }))).status).toBe(400);
    expect((await post(req({ ...valid, pad: "x".repeat(5000) }))).status).toBe(413);
    expect(state.inserts).toHaveLength(0);
  });

  it("begrenzt die Zahl der Einträge pro Minute", async () => {
    state.count = 120;
    expect((await post(req(valid))).status).toBe(429);
    expect(state.inserts).toHaveLength(0);
  });

  it("meldet eine fehlende Migration", async () => {
    state.failWith = 'relation "public.consent_configs" does not exist';
    const res = await post(req(valid));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "migration" });
  });

  it("antwortet im Modus aus nicht", async () => {
    const off = createConsentHandler(defineConsentConfig({ dienste: [] }));
    expect((await off(req(valid))).status).toBe(404);
  });
});

describe("Textstand", () => {
  it("ist stabil und ändert sich bei jeder Textänderung", () => {
    expect(snapshotHash(config)).toBe(snapshotHash(defineConsentConfig({ dienste: ["google-maps", "youtube"] })));
    const edited = defineConsentConfig({ dienste: [{ ...dienst("google-maps"), zweck: "Anderer Text." }, "youtube"] });
    expect(snapshotHash(edited)).not.toBe(snapshotHash(config));
  });
  it("enthält den Wortlaut der festen Texte und die Dienste", () => {
    const snap = buildSnapshot(config);
    expect(snap.texte.btnAlleAblehnen).toBe("Alle ablehnen");
    expect(snap.dienste.map((d) => d.id)).toEqual(["google-maps", "youtube"]);
  });
});
