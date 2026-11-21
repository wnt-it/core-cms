// @vitest-environment jsdom
// Prüft das Verhalten, auf das es rechtlich ankommt: vorher nichts laden, gleichwertige Buttons, Ablehnung wird gespeichert,
// kein Banner auf Rechtsseiten und im Admin, Widerruf nimmt den Inhalt wieder weg.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";

let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import { ConsentGate } from "../../src/consent/ConsentGate";
import { ConsentProvider } from "../../src/consent/ConsentProvider";
import { ConsentSettingsLink } from "../../src/consent/ConsentSettingsLink";
import { defineConsentConfig } from "../../src/consent/config";
import { CONSENT_LIFETIME_MS, STORAGE_KEY } from "../../src/consent/logic";

const embeds = defineConsentConfig({ dienste: ["google-maps", "youtube"] });
const banner = defineConsentConfig({ modus: "banner", dienste: ["google-maps", "youtube"] });

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

function app(config = embeds, extra: ReactNode = null) {
  return (
    <ConsentProvider config={config}>
      <main>
        <ConsentGate service="google-maps">
          <iframe title="karte" src="https://www.google.com/maps/embed?pb=1" />
        </ConsentGate>
        {extra}
      </main>
    </ConsentProvider>
  );
}

const float = () =>
  waitFor(() => {
    const b = document.querySelector<HTMLButtonElement>(".wnt-consent-float");
    if (!b) throw new Error("Button Cookie-Einstellungen fehlt");
    return b;
  });
const stored = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};
const sentBodies = () => fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string));

beforeEach(() => {
  mockPath = "/";
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Zwei-Klick-Lösung (Modus einbettung)", () => {
  it("lädt vor der Zustimmung nichts und zeigt die Pflichtangaben", async () => {
    const { container } = render(app());
    await waitFor(() => expect(screen.getByTestId("consent-gate")).toBeTruthy());
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText(/Beim Laden werden Daten an den Anbieter übermittelt/)).toBeTruthy();
    expect(screen.getAllByText(/Google Ireland Limited/).length).toBeGreaterThan(0);
    expect(screen.getByText(/freiwillig und keine Bedingung/)).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("zeigt in diesem Modus keinen Banner, aber den Button Cookie-Einstellungen", async () => {
    render(app());
    expect((await float()).textContent).toBe("Cookie-Einstellungen");
    expect(screen.queryByTestId("consent-banner")).toBeNull();
  });

  it("lädt nach Klick, speichert nur Status (keine ID) und protokolliert ohne ID", async () => {
    const { container } = render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Inhalt laden und Dienst erlauben" }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());

    const s = stored();
    expect(s.c).toEqual({ "google-maps": true });
    expect(Object.keys(s).sort()).toEqual(["at", "c", "exp", "k", "v"]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/consent");
    expect(init.credentials).toBe("omit");
    expect(sentBodies()[0]).toMatchObject({ trigger: "embed", choices: { "google-maps": true } });
  });

  it("erinnert sich beim nächsten Besuch, ohne erneut zu fragen", async () => {
    const first = render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Inhalt laden und Dienst erlauben" }));
    await waitFor(() => expect(first.container.querySelector("iframe")).not.toBeNull());
    first.unmount();

    const second = render(app());
    await waitFor(() => expect(second.container.querySelector("iframe")).not.toBeNull());
    expect(screen.queryByTestId("consent-gate")).toBeNull();
  });

  it("nach Ablauf wird wieder gefragt", async () => {
    const expired = { v: 1, at: 1, exp: Date.now() - 1, c: { "google-maps": true }, k: { "google-maps": "google-maps@1" } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
    const { container } = render(app());
    await waitFor(() => expect(screen.getByTestId("consent-gate")).toBeTruthy());
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("ohne Provider oder bei unbekanntem Dienst wird nie geladen", () => {
    const a = render(
      <ConsentGate service="google-maps">
        <iframe title="karte" />
      </ConsentGate>,
    );
    expect(a.container.querySelector("iframe")).toBeNull();
    a.unmount();
    const b = render(
      <ConsentProvider config={embeds}>
        <ConsentGate service="gibt-es-nicht">
          <iframe title="karte" />
        </ConsentGate>
      </ConsentProvider>,
    );
    expect(b.container.querySelector("iframe")).toBeNull();
  });

  it("Widerruf über die Einstellungen nimmt den Inhalt wieder weg und wird protokolliert", async () => {
    const { container } = render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Inhalt laden und Dienst erlauben" }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    fetchMock.mockClear();

    fireEvent.click(await float());
    const dialog = await screen.findByRole("dialog");
    const toggle = within(dialog).getByRole("switch", { name: /Google Maps/ });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    fireEvent.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));

    await waitFor(() => expect(container.querySelector("iframe")).toBeNull());
    expect(stored().c["google-maps"]).toBe(false);
    await waitFor(() => expect(sentBodies()[0]).toMatchObject({ trigger: "settings", choices: { "google-maps": false }, action: "reject_all" }));
  });

  it("Schließen des Dialogs ohne Auswahl speichert nichts", async () => {
    render(app());
    fireEvent.click(await float());
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Im Dialog ist nichts vorausgewählt", async () => {
    render(app());
    fireEvent.click(await float());
    const dialog = await screen.findByRole("dialog");
    for (const sw of within(dialog).getAllByRole("switch")) expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("Footer-Link öffnet den Dialog", async () => {
    render(app(embeds, <ConsentSettingsLink>Einstellungen im Footer</ConsentSettingsLink>));
    fireEvent.click(await screen.findByRole("button", { name: "Einstellungen im Footer" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("Fehlschlag beim Protokoll: Auswahl gilt, Ereignis wartet und geht beim nächsten Aufruf raus", async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error("offline");
    });
    const { container, unmount } = render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Inhalt laden und Dienst erlauben" }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    await waitFor(() => expect(localStorage.getItem("cms_consent_pending")).not.toBeNull());
    unmount();

    fetchMock.mockClear();
    render(app());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(localStorage.getItem("cms_consent_pending")).toBeNull());
  });
});

describe("Banner (Modus banner)", () => {
  it("zeigt gleichwertige Buttons auf der ersten Ebene und alle Pflichtangaben", async () => {
    render(app(banner));
    const el = await screen.findByTestId("consent-banner");
    const buttons = within(el).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Alle ablehnen", "Alle zulassen", "Einstellungen"]);
    // identische Gestaltung: dieselbe Klasse, keine Varianten, keine Inline-Stile
    expect(new Set(buttons.map((b) => b.className)).size).toBe(1);
    expect(buttons.every((b) => !b.getAttribute("style"))).toBe(true);
    // keine Schließen-Schaltfläche
    expect(within(el).queryByRole("button", { name: /schließen|×|✕/i })).toBeNull();
    // Überschrift, Anbieter, Freiwilligkeit, Links
    expect(within(el).getByRole("heading", { name: "Einwilligung zur Datenübermittlung an externe Anbieter" })).toBeTruthy();
    expect(within(el).getAllByText(/Google Ireland Limited/).length).toBeGreaterThan(0);
    expect(within(el).getByText(/freiwillig und keine Bedingung/)).toBeTruthy();
    expect(within(el).getByRole("link", { name: "Datenschutzerklärung" }).getAttribute("href")).toBe("/datenschutz");
    expect(within(el).getByRole("link", { name: "Impressum" }).getAttribute("href")).toBe("/impressum");
  });

  it("vor der Entscheidung wird nichts geladen und nichts gespeichert", async () => {
    const { container } = render(app(banner));
    await screen.findByTestId("consent-banner");
    expect(container.querySelector("iframe")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Alle ablehnen wird gespeichert, der Banner kommt nicht wieder", async () => {
    const first = render(app(banner));
    fireEvent.click(await screen.findByRole("button", { name: "Alle ablehnen" }));
    await waitFor(() => expect(screen.queryByTestId("consent-banner")).toBeNull());
    expect(stored().c).toEqual({ "google-maps": false, youtube: false });
    expect(first.container.querySelector("iframe")).toBeNull();
    await waitFor(() => expect(sentBodies()[0]).toMatchObject({ action: "reject_all", trigger: "banner" }));
    first.unmount();

    render(app(banner));
    await float();
    expect(screen.queryByTestId("consent-banner")).toBeNull();
  });

  it("Alle zulassen lädt den Inhalt", async () => {
    const { container } = render(app(banner));
    fireEvent.click(await screen.findByRole("button", { name: "Alle zulassen" }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    expect(stored().c).toEqual({ "google-maps": true, youtube: true });
  });

  it("Weiterklicken, Scrollen oder Klick daneben ist keine Zustimmung", async () => {
    const { container } = render(app(banner));
    await screen.findByTestId("consent-banner");
    fireEvent.scroll(window);
    fireEvent.click(document.body);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("consent-banner")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("zeigt keinen Banner auf Datenschutz und Impressum", async () => {
    for (const p of ["/datenschutz", "/impressum"]) {
      mockPath = p;
      const { unmount } = render(app(banner));
      await float();
      expect(screen.queryByTestId("consent-banner")).toBeNull();
      unmount();
    }
  });

  it("zeigt im Admin nichts", async () => {
    mockPath = "/admin/seiten";
    const { container } = render(app(banner));
    await waitFor(() => expect(screen.getByTestId("consent-gate")).toBeTruthy());
    expect(screen.queryByTestId("consent-banner")).toBeNull();
    expect(document.querySelector(".wnt-consent-float")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("ein neuer Dienst wird nachgefragt, die frühere Entscheidung bleibt", async () => {
    const alt = defineConsentConfig({ modus: "banner", dienste: ["google-maps"] });
    const first = render(app(alt));
    fireEvent.click(await screen.findByRole("button", { name: "Alle ablehnen" }));
    await waitFor(() => expect(screen.queryByTestId("consent-banner")).toBeNull());
    first.unmount();

    render(app(banner));
    const el = await screen.findByTestId("consent-banner");
    expect(within(el).getByText("YouTube")).toBeTruthy();
    expect(within(el).queryByText("Google Maps")).toBeNull();
  });
});

describe("Lebensdauer", () => {
  it("die Entscheidung gilt 12 Monate", async () => {
    render(app(banner));
    fireEvent.click(await screen.findByRole("button", { name: "Alle ablehnen" }));
    await waitFor(() => expect(stored()).not.toBeNull());
    expect(stored().exp - stored().at).toBe(CONSENT_LIFETIME_MS);
  });
});
