import { describe, expect, it, vi } from "vitest";
import { cleanupPendingAttachments, PENDING_MAX_AGE_MS } from "../../src/submissions/cleanup";

/** Kleiner Nachbau des Supabase-Clients: merkt sich Filter und Aufrufe */
function fakeService(rows: { id: string; path: string }[], removeError: unknown = null) {
  const calls: Record<string, unknown[]> = { filters: [], removed: [], deleted: [] };
  const select = {
    eq: (...a: unknown[]) => (calls.filters.push(["eq", ...a]), select),
    lt: (...a: unknown[]) => (calls.filters.push(["lt", ...a]), select),
    limit: async () => ({ data: rows, error: null }),
  };
  const service = {
    from: () => ({
      select: () => select,
      delete: () => ({ in: async (_c: string, ids: string[]) => (calls.deleted.push(...ids), { error: null }) }),
    }),
    storage: { from: () => ({ remove: vi.fn(async (paths: string[]) => (calls.removed.push(...paths), { error: removeError })) }) },
  };
  return { service: service as never, calls };
}

describe("Ausstehende Anhänge aufräumen", () => {
  it("löscht Datei und Eintrag, nur alte ausstehende", async () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    const { service, calls } = fakeService([{ id: "f1", path: "s1/f1-a.pdf" }]);
    expect(await cleanupPendingAttachments(service, { now })).toBe(1);
    expect(calls.removed).toEqual(["s1/f1-a.pdf"]);
    expect(calls.deleted).toEqual(["f1"]);
    expect(calls.filters).toContainEqual(["eq", "status", "ausstehend"]);
    expect(calls.filters).toContainEqual(["lt", "created_at", new Date(now - PENDING_MAX_AGE_MS).toISOString()]);
  });

  it("lässt Einträge stehen, wenn der Speicher nicht löschen konnte", async () => {
    const { service, calls } = fakeService([{ id: "f1", path: "x" }], { message: "kaputt" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await cleanupPendingAttachments(service)).toBe(0);
    expect(calls.deleted).toEqual([]);
  });
});
