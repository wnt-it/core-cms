// @vitest-environment jsdom
// Speicheranzeige der Mediathek: Platz von Anfang an reserviert, Ring mit Prozent, Warnstufen.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const getStorageUsage = vi.fn();
vi.mock("../../src/media/storage-usage", () => ({ getStorageUsage: () => getStorageUsage() }));

const GB = 1024 * 1024 * 1024;

async function load() {
  vi.resetModules();
  return (await import("../../src/media/StorageUsage")).StorageUsage;
}

afterEach(() => {
  cleanup();
  getStorageUsage.mockReset();
});

describe("Speicheranzeige", () => {
  it("reserviert den Platz schon beim Laden", async () => {
    getStorageUsage.mockReturnValue(new Promise(() => {}));
    const StorageUsage = await load();
    const { container } = render(<StorageUsage />);
    expect(container.firstElementChild?.getAttribute("title")).toBe("Speicher wird geladen");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("zeigt Prozent und „von“ mit Kontingent", async () => {
    getStorageUsage.mockResolvedValue({ ok: true, usedBytes: 2 * GB, quotaBytes: 5 * GB });
    const StorageUsage = await load();
    render(<StorageUsage />);
    const meter = await screen.findByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("40");
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("2 GB von 5 GB")).toBeTruthy();
  });

  it("warnt ab 80 % im Tooltip", async () => {
    getStorageUsage.mockResolvedValue({ ok: true, usedBytes: 4.5 * GB, quotaBytes: 5 * GB });
    const StorageUsage = await load();
    const { container } = render(<StorageUsage />);
    await screen.findByText("90%");
    expect(container.firstElementChild?.getAttribute("title")).toMatch(/fast ausgeschöpft/);
  });

  it("ohne Kontingent nur den belegten Speicher, bei Fehler nichts", async () => {
    getStorageUsage.mockResolvedValue({ ok: true, usedBytes: 50 * 1024 * 1024, quotaBytes: null });
    let StorageUsage = await load();
    render(<StorageUsage />);
    expect(await screen.findByText("50 MB belegt")).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
    cleanup();

    getStorageUsage.mockResolvedValue({ ok: false });
    StorageUsage = await load();
    const { container } = render(<StorageUsage />);
    await waitFor(() => expect(container.firstElementChild).toBeNull());
  });
});
