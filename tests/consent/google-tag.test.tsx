// @vitest-environment jsdom
// GoogleTag im Zusammenspiel mit dem Banner: vor der Entscheidung und nach „Alle ablehnen“ kein Google-Skript,
// nach Zustimmung genau ein Skript mit Consent Mode v2, Widerruf räumt die Google-Cookies weg.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import { ConsentProvider } from "../../src/consent/ConsentProvider";
import { GoogleTag } from "../../src/consent/GoogleTag";
import { defineConsentConfig } from "../../src/consent/config";
import { pushGoogleEvent } from "../../src/consent/google";
import { STORAGE_KEY } from "../../src/consent/logic";

const config = defineConsentConfig({ dienste: ["google-analytics", "google-ads"], rechtsseiten: ["/datenschutzerklaerung", "/impressum"] });
const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

type W = Window & { dataLayer?: unknown[]; gtag?: unknown; __wntGoogleLoaded?: boolean; __wntGoogleConfigured?: string[] };
const w = () => window as W;
const googleScripts = () => [...document.querySelectorAll<HTMLScriptElement>("script[src]")].filter((s) => s.src.includes("googletagmanager.com"));
const args = (entry: unknown) => Array.from(entry as ArrayLike<unknown>);
const consentUpdates = () =>
  (w().dataLayer ?? []).filter((e) => args(e)[0] === "consent" && args(e)[1] === "update").map((e) => args(e)[2] as Record<string, string>);

function app(props: Parameters<typeof GoogleTag>[0] = { gtmId: "GTM-TEST123" }) {
  return (
    <ConsentProvider config={config}>
      <main>Seite</main>
      <GoogleTag {...props} />
    </ConsentProvider>
  );
}

beforeEach(() => {
  mockPath = "/";
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  for (const s of googleScripts()) s.remove();
  delete w().dataLayer;
  delete w().gtag;
  delete w().__wntGoogleLoaded;
  delete w().__wntGoogleConfigured;
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
  }
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GoogleTag", () => {
  it("lädt vor der Entscheidung nichts von Google und zeigt den Banner", async () => {
    render(app());
    expect(await screen.findByTestId("consent-banner")).toBeTruthy();
    expect(googleScripts()).toHaveLength(0);
    expect(w().dataLayer).toBeUndefined();
    expect(pushGoogleEvent("anfrage_gesendet")).toBe(false);
  });

  it("nach „Alle ablehnen“ bleibt es dabei", async () => {
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Alle ablehnen" }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull());
    expect(googleScripts()).toHaveLength(0);
    expect(w().dataLayer).toBeUndefined();
  });

  it("nach „Alle zulassen“ lädt genau ein Tag-Manager-Skript mit erteilten Signalen", async () => {
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Alle zulassen" }));
    await waitFor(() => expect(googleScripts()).toHaveLength(1));
    expect(googleScripts()[0].src).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TEST123");
    const dl = w().dataLayer!;
    expect(args(dl[0]).slice(0, 2)).toEqual(["consent", "default"]);
    expect(consentUpdates().at(-1)).toMatchObject({ analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
    expect(pushGoogleEvent("anfrage_gesendet", { anfrage_typ: "test" })).toBe(true);
    expect(dl.at(-1)).toEqual({ event: "anfrage_gesendet", anfrage_typ: "test" });
  });

  it("nur Statistik erlaubt: Werbe-Signale bleiben verweigert, später zusätzlich Werbung wird nachgemeldet", async () => {
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Einstellungen" }));
    let dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("switch", { name: /Google Analytics/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));
    await waitFor(() => expect(googleScripts()).toHaveLength(1));
    expect(consentUpdates().at(-1)).toMatchObject({ analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied" });

    fireEvent.click(document.querySelector<HTMLButtonElement>(".wnt-consent-float")!);
    dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("switch", { name: /Google Ads/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));
    await waitFor(() => expect(consentUpdates().at(-1)).toMatchObject({ analytics_storage: "granted", ad_storage: "granted" }));
    expect(googleScripts()).toHaveLength(1);
  });

  it("gtag.js ohne Tag Manager: GA4 wird nur mit Statistik-Einwilligung eingerichtet", async () => {
    render(app({ gaId: "G-TEST12345", adsId: "AW-123456789" }));
    fireEvent.click(await screen.findByRole("button", { name: "Einstellungen" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("switch", { name: /Google Ads/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));
    await waitFor(() => expect(googleScripts()).toHaveLength(1));
    expect(googleScripts()[0].src).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST12345");
    const configs = w().dataLayer!.filter((e) => args(e)[0] === "config").map((e) => args(e)[1]);
    expect(configs).toEqual(["AW-123456789"]);
  });

  it("Widerruf löscht die Google-Cookies (auch mit Platzhalter-Namen)", async () => {
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Alle zulassen" }));
    await waitFor(() => expect(googleScripts()).toHaveLength(1));
    document.cookie = "_ga=GA1.1.1; path=/";
    document.cookie = "_ga_ABC123=GS1.1.1; path=/";
    document.cookie = "_gcl_au=1.1.1; path=/";
    document.cookie = "andere=bleibt; path=/";

    fireEvent.click(document.querySelector<HTMLButtonElement>(".wnt-consent-float")!);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Alle ablehnen" }));
    await waitFor(() => expect(document.cookie).not.toMatch(/_ga/));
    expect(document.cookie).not.toMatch(/_gcl_au/);
    expect(document.cookie).toMatch(/andere=bleibt/);
  });

  it("ohne ID, mit ungültiger ID, im Admin oder ohne Provider wird nichts geladen", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, at: Date.now(), exp: Date.now() + 1e9, c: { "google-analytics": true, "google-ads": true }, k: { "google-analytics": "google-analytics@1", "google-ads": "google-ads@1" } }),
    );
    const a = render(app({}));
    await new Promise((r) => setTimeout(r, 20));
    expect(googleScripts()).toHaveLength(0);
    a.unmount();

    const b = render(app({ gtmId: "GTM-x\"><img>" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(googleScripts()).toHaveLength(0);
    expect(err).toHaveBeenCalled();
    b.unmount();

    mockPath = "/admin/posteingang";
    const c = render(app());
    await new Promise((r) => setTimeout(r, 20));
    expect(googleScripts()).toHaveLength(0);
    c.unmount();

    mockPath = "/";
    render(<GoogleTag gtmId="GTM-TEST123" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(googleScripts()).toHaveLength(0);
    err.mockRestore();
  });

  it("gespeicherte Zustimmung lädt beim nächsten Besuch ohne Banner", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, at: Date.now(), exp: Date.now() + 1e9, c: { "google-analytics": true, "google-ads": false }, k: { "google-analytics": "google-analytics@1", "google-ads": "google-ads@1" } }),
    );
    render(app());
    await waitFor(() => expect(googleScripts()).toHaveLength(1));
    expect(screen.queryByTestId("consent-banner")).toBeNull();
    expect(consentUpdates().at(-1)).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
  });

  it("kein Banner auf den eingetragenen Rechtsseiten", async () => {
    mockPath = "/datenschutzerklaerung";
    render(app());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("consent-banner")).toBeNull();
    expect(googleScripts()).toHaveLength(0);
  });
});
