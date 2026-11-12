// submitContactForm (ältere Formulare) hat ab v0.16.0 Spam-Schutz.
import { beforeEach, describe, expect, it, vi } from "vitest";

const insertSubmission = vi.fn(async () => "neue-id");
const notifySubmission = vi.fn(async () => {});
vi.mock("../../src/submissions/save", () => ({ insertSubmission, notifySubmission }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "9.9.9.9" }) }));

const { submitContactForm } = await import("../../src/submissions/submit-contact-form");
const { resetGuard } = await import("../../src/submissions/guard");

beforeEach(() => {
  resetGuard();
  insertSubmission.mockClear();
});

describe("submitContactForm", () => {
  it("speichert normale Anfragen und kürzt zu lange Felder", async () => {
    await submitContactForm({ name: "x".repeat(500), message: "Hallo" });
    expect(insertSubmission).toHaveBeenCalledTimes(1);
    const arg = insertSubmission.mock.calls[0] as unknown as [{ columns: { name: string } }];
    expect(arg[0].columns.name).toHaveLength(200);
  });

  it("verwirft Bots still, wenn FormGuard-Felder mitkommen", async () => {
    const r = await submitContactForm({ name: "Bot", website: "http://spam", form_age: "9000" } as never);
    expect(r.success).toBe(true);
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it("lehnt zu viele Links ab", async () => {
    const links = Array.from({ length: 6 }, (_, i) => `https://x${i}.example`).join(" ");
    await expect(submitContactForm({ message: links })).rejects.toThrow(/Links/);
  });

  it("begrenzt auf 5 Anfragen je Adresse", async () => {
    for (let i = 0; i < 5; i++) await submitContactForm({ message: `Nr. ${i}` });
    await expect(submitContactForm({ message: "6" })).rejects.toThrow(/Zu viele/);
    expect(insertSubmission).toHaveBeenCalledTimes(5);
  });
});
