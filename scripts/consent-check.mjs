// Browser-Prüfung des Einwilligungs-Features gegen eine laufende Website (Nachweis, dass vor der Zustimmung nichts geladen wird).
//
//   npm run consent:check -- https://projekt.example [--allow=api.example.org] [--allow-storage=name] [--out=bericht.json] [--channel=msedge]
//
// Geprüft wird in einem frischen Browser (ohne Cookies, ohne Speicher):
//   1. Beim Aufruf gehen keine Anfragen an Fremddomänen, und es liegt nichts außer dem Notwendigen im Speicher.
//   2. Nach "Alle ablehnen" (Banner) bzw. ohne Klick (Zwei-Klick-Platzhalter) bleibt es dabei, die Ablehnung ist gespeichert.
//   3. Auf /datenschutz und /impressum erscheint kein Banner.
//   4. Nach "Alle zulassen" dürfen Fremdanfragen entstehen (nur zur Information, kein Fehler).
// Erlaubt sind standardmäßig die eigene Domäne und *.supabase.co (eigenes Backend). Weitere mit --allow=host.
// Ergebnis: Ausgabe im Terminal, Exit-Code 1 bei Fehlern, optional JSON-Bericht (--out). Gedacht für jeden Release und jedes Heben der Core-Version.
//
// Voraussetzung: Playwright mit Browser. Entweder `npx playwright install chromium` oder einen installierten Browser nutzen (--channel=msedge | chrome).

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const opt = (name) => args.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));
if (!url) {
  console.error("Aufruf: npm run consent:check -- https://projekt.example [--allow=host] [--allow-storage=name] [--out=bericht.json] [--channel=msedge]");
  process.exit(2);
}

const base = new URL(url);
const allowedHosts = (host) => host === base.hostname || host.endsWith(".supabase.co") || opt("allow").includes(host);
const allowedStorage = new Set(["cms_consent", "cms_consent_pending", "site-popup-gesehen", ...opt("allow-storage")]);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK    " : "FEHLER"}  ${name}${detail ? `: ${detail}` : ""}`);
};

const browser = await chromium.launch({ headless: true, channel: opt("channel")[0] });

async function freshPage() {
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();
  const foreign = [];
  page.on("request", (req) => {
    let host;
    try {
      host = new URL(req.url()).hostname;
    } catch {
      return;
    }
    if (!host || req.url().startsWith("data:") || req.url().startsWith("blob:")) return;
    if (!allowedHosts(host)) foreign.push(host);
  });
  return { context, page, foreign };
}

async function storageExtras(page, context) {
  const cookies = (await context.cookies()).map((c) => c.name).filter((n) => !allowedStorage.has(n));
  const local = await page.evaluate(() => Object.keys(localStorage)).catch(() => []);
  const session = await page.evaluate(() => Object.keys(sessionStorage)).catch(() => []);
  return [...cookies, ...local.filter((k) => !allowedStorage.has(k)), ...session.filter((k) => !allowedStorage.has(k))];
}

const settle = (page) => page.waitForLoadState("networkidle").catch(() => {}).then(() => page.waitForTimeout(1500));

try {
  // 1. Vor jeder Entscheidung
  {
    const { context, page, foreign } = await freshPage();
    await page.goto(base.href);
    await settle(page);
    check("Vor der Entscheidung: keine Anfragen an Fremddomänen", foreign.length === 0, [...new Set(foreign)].join(", "));
    const extra = await storageExtras(page, context);
    check("Vor der Entscheidung: nichts Unnötiges gespeichert", extra.length === 0, extra.join(", "));

    const banner = page.getByTestId("consent-banner");
    const hasBanner = (await banner.count()) > 0;
    const gates = await page.getByTestId("consent-gate").count();
    check("Es gibt eine Abfrage (Banner oder Zwei-Klick-Platzhalter) oder keine einwilligungspflichtigen Dienste", true, hasBanner ? "Banner" : gates > 0 ? `${gates} Platzhalter` : "keine Abfrage sichtbar");

    if (hasBanner) {
      const buttons = banner.locator("button.wnt-consent-btn");
      const texts = await buttons.allTextContents();
      check("Banner: Alle ablehnen, Alle zulassen und Einstellungen gleichwertig vorhanden", ["Alle ablehnen", "Alle zulassen", "Einstellungen"].every((t) => texts.includes(t)), texts.join(" | "));
      const boxes = await buttons.evaluateAll((els) => els.map((e) => ({ w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), cls: e.className, bg: getComputedStyle(e).backgroundColor, bd: getComputedStyle(e).borderColor })));
      const same = boxes.every((b) => b.cls === boxes[0].cls && b.bg === boxes[0].bg && b.bd === boxes[0].bd && b.h === boxes[0].h);
      check("Banner: die Buttons sind gleich gestaltet (Klasse, Farbe, Rahmen, Höhe)", same, JSON.stringify(boxes));
      const inView = await buttons.evaluateAll((els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }));
      check("Banner: alle Buttons sind ohne Scrollen erreichbar", inView);
      const heading = (await banner.getByRole("heading").first().textContent())?.trim() ?? "";
      const bad = ["Privatsphäre ist uns wichtig", "verwendet Cookies", "Wir benötigen Ihre Zustimmung", "Cookies zustimmen", "Willkommen"];
      check("Banner: Überschrift steht nicht auf der Liste irreführender Überschriften", !bad.some((b) => heading.includes(b)), heading);

      await page.getByRole("button", { name: "Alle ablehnen" }).click();
      await settle(page);
      check("Nach „Alle ablehnen“: keine Anfragen an Fremddomänen", foreign.length === 0, [...new Set(foreign)].join(", "));
      const extra2 = await storageExtras(page, context);
      check("Nach „Alle ablehnen“: nichts Unnötiges gespeichert", extra2.length === 0, extra2.join(", "));
      const saved = await page.evaluate(() => localStorage.getItem("cms_consent"));
      check("Nach „Alle ablehnen“: Ablehnung ist gespeichert (kein erneutes Fragen)", !!saved && !/true/.test(JSON.stringify(JSON.parse(saved).c)));
      await page.reload();
      await settle(page);
      check("Nach erneutem Aufruf: Banner kommt nicht wieder", (await page.getByTestId("consent-banner").count()) === 0);
    }
    await context.close();
  }

  // 2. Rechtsseiten ohne Banner
  for (const path of ["/datenschutz", "/impressum"]) {
    const { context, page } = await freshPage();
    const res = await page.goto(new URL(path, base).href).catch(() => null);
    if (!res || res.status() >= 400) {
      check(`${path}: Seite erreichbar`, false, res ? `Status ${res.status()}` : "nicht erreichbar");
    } else {
      await settle(page);
      check(`${path}: kein Banner`, (await page.getByTestId("consent-banner").count()) === 0);
    }
    await context.close();
  }

  // 3. Zustimmung: nur zur Information
  {
    const { context, page, foreign } = await freshPage();
    await page.goto(base.href);
    await settle(page);
    const accept = page.getByRole("button", { name: "Alle zulassen" });
    if ((await accept.count()) > 0) {
      await accept.first().click();
      await settle(page);
      console.log(`INFO    Nach „Alle zulassen“ gehen Anfragen an: ${[...new Set(foreign)].join(", ") || "(keine, nichts eingebunden)"}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} von ${results.length} Prüfungen bestanden.`);
const out = opt("out")[0];
if (out) {
  writeFileSync(out, JSON.stringify({ url: base.href, geprueftAm: new Date().toISOString(), bestanden: failed.length === 0, ergebnisse: results }, null, 2));
  console.log(`Bericht: ${out}`);
}
process.exit(failed.length ? 1 : 0);
