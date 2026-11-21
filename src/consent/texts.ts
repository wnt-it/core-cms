// Feste Texte des Einwilligungs-Features. Sie sind für alle Projekte gleich und nicht pro Projekt änderbar.
// Maßstab: FAQ des LfDI Baden-Württemberg (docs/REFERENZ_LFDI_BW_COOKIES_TRACKING.md).
// Änderungen an diesen Texten sind rechtlich relevant: Version erhöhen (TEXT_VERSION), Release anlegen,
// vorher juristisch gegenlesen lassen.

/** Fassung der festen Texte, wandert in den Textstand im Protokoll. */
export const TEXT_VERSION = "2026-11-06";

export const TEXTS = {
  /** Überschrift des Banners (nur im Modus „banner“). Allgemein, mit Bezug zur Tragweite, nichts von der Liste der FAQ. */
  bannerHeadline: "Einwilligung zur Datenübermittlung an externe Anbieter",
  bannerIntro:
    "Diese Website möchte die folgenden externen Dienste einsetzen. Dabei werden Daten an die genannten Anbieter übertragen, teils auch in Länder außerhalb der EU. Ohne Ihre Zustimmung wird nichts geladen und nichts gespeichert, außer dem technisch Notwendigen.",
  /** Überschrift am Platzhalter einer Einbettung. */
  gateHeadline: "Externer Inhalt: Beim Laden werden Daten an den Anbieter übermittelt",
  gateIntro: "Dieser Inhalt kommt von einem externen Anbieter und wird erst geladen, wenn Sie zustimmen:",
  gateUebertragen: "Übertragen werden:",
  gateDrittlandKurz: "Die Daten gehen auch in Länder außerhalb der EU.",
  gateDetails: "Alle Angaben zum Anbieter",
  dialogHeadline: "Cookie-Einstellungen",
  dialogIntro:
    "Hier sehen Sie alle externen Dienste dieser Website und können für jeden einzeln entscheiden. Alles, was ausgeschaltet ist, wird nicht geladen.",
  freiwillig:
    "Ihre Zustimmung ist freiwillig und keine Bedingung für die Nutzung dieser Website. Sie können sie jederzeit widerrufen: über „Cookie-Einstellungen“ am unteren Seitenrand.",
  /** Wird nur gezeigt, wenn mindestens ein Dienst in ein Drittland übermittelt. */
  drittland:
    "Dieser Dienst übermittelt Daten in Länder außerhalb der EU. Die genannte Rechtsgrundlage soll ein angemessenes Schutzniveau sichern, ein Restrisiko (z. B. Zugriff von Behörden) bleibt.",
  notwendigTitel: "Technisch notwendig",
  notwendigText:
    "Diese Website speichert Ihre Auswahl hier auf Ihrem Gerät, damit sie nicht bei jedem Besuch neu fragen muss (nur ja oder nein je Dienst und ein Ablaufdatum). Dafür ist keine Einwilligung nötig.",
  btnAlleZulassen: "Alle zulassen",
  btnAlleAblehnen: "Alle ablehnen",
  btnEinstellungen: "Einstellungen",
  btnSpeichern: "Auswahl speichern",
  btnSchliessen: "Schließen",
  btnLaden: "Inhalt laden und Dienst erlauben",
  linkEinstellungen: "Cookie-Einstellungen",
  an: "An",
  aus: "Aus",
  datenschutz: "Datenschutzerklärung",
  impressum: "Impressum",
  anbieter: "Anbieter",
  daten: "Übertragene Daten",
  zweck: "Wozu",
  speicherung: "Speicherung auf Ihrem Gerät",
  grundlage: "Rechtsgrundlage der Übermittlung",
  zurDatenschutzerklaerung: "Datenschutzhinweise des Anbieters",
} as const;

/**
 * Überschriften, die die FAQ des LfDI Baden-Württemberg (B 1.3.7) als irreführend nennt,
 * plus Muster, die dort sinngemäß gemeint sind. Ein Test prüft alle Überschriften gegen diese Liste.
 */
export const FORBIDDEN_HEADLINES = [
  "Wir lieben Cookies",
  "Diese Webseite verwendet Cookies",
  "Diese Website verwendet Cookies",
  "Willkommen",
  "Ihre Privatsphäre ist uns wichtig",
  "Wir respektieren Ihre Privatsphäre",
  "Es ist uns ein Anliegen, Ihre Daten zu schützen",
  "Wir benötigen Ihre Zustimmung",
  "Weiter mit Werbung lesen",
  "Mit Liebe serviert",
  "Wir halten uns an die DS-GVO",
  "Wir schneiden hier alles auf dich zu",
  "Ein Klick für den Datenschutz",
  "Diese Webseite mit Werbung und Cookies nutzen",
  "Cookies zustimmen",
  "Bevor Sie zum Inhalt weitergehen",
  "Ihr bestmögliches Nutzererlebnis",
  "Helfen Sie uns mit Ihrer Zustimmung",
] as const;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/website/g, "webseite")
    .replace(/[^a-zäöü0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** true, wenn die Überschrift (nach Vereinfachung) einer verbotenen entspricht oder sie enthält. */
export function isForbiddenHeadline(headline: string): boolean {
  const h = normalize(headline);
  return FORBIDDEN_HEADLINES.some((f) => {
    const n = normalize(f);
    return h === n || h.includes(n);
  });
}

/** Beschriftungen der Hauptbuttons, die als mehrdeutig gelten (FAQ B 1.3.12.1) und nicht vorkommen dürfen. */
export const FORBIDDEN_BUTTON_LABELS = ["Bestätigen", "OK", "Okay", "Akzeptieren", "Zustimmen", "Weiter"] as const;
