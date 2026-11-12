// Dienst-Katalog: bekannte Dienste mit allem, was Banner und Datenschutzerklärung brauchen.
// Ein neuer Dienst ist ein Eintrag hier, danach in jedem Projekt mit dienst("id") nutzbar.
// Wesentliche Änderungen (neuer Zweck, Anbieter, Drittland) erhöhen `revision` und lösen eine neue Frage aus.
// Reine Textkorrekturen lassen `revision` unverändert.
//
// Wichtig: Vor jedem neuen Eintrag die Vorprüfung durchgehen (docs/COOKIE_BANNER_KONZEPT.md, Abschnitt 3a):
// Geht es ohne Dritten? Gibt es eine datenschutzfreundliche Variante? Trägt die Drittland-Übermittlung?

import type { ConsentService } from "./types";

export const CONSENT_CATALOG: Record<string, ConsentService> = {
  "google-maps": {
    id: "google-maps",
    art: "einbettung",
    kategorie: "funktional",
    name: "Google Maps",
    anbieter: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
    zweck: "Zeigt Standorte auf einer Karte.",
    daten: "Ihre IP-Adresse, die aufgerufene Seite und der Kartenausschnitt. Google kann Cookies setzen und die Angaben mit Daten verknüpfen, die Google schon über Sie hat.",
    drittland: true,
    drittlandGrundlage: "EU-US Data Privacy Framework und Standardvertragsklauseln",
    datenschutzUrl: "https://policies.google.com/privacy",
    speicher: [{ name: "NID", art: "cookie", dauer: "bis zu 6 Monate" }],
    revision: 1,
    rolle: "eigener-verantwortlicher",
    geprueftAm: "2026-11-06",
    alternative: "Link auf die Karte statt Einbettung oder OpenStreetMap über eigenen Proxy (bei Kunden in Baden-Württemberg auch Maps4BW).",
    datenschutzBaustein: "karten",
  },
  youtube: {
    id: "youtube",
    art: "einbettung",
    kategorie: "marketing",
    name: "YouTube",
    anbieter: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
    zweck: "Zeigt eingebettete Videos (erweiterter Datenschutzmodus).",
    daten: "Ihre IP-Adresse, die aufgerufene Seite und Angaben zum Gerät. YouTube kann Cookies setzen und die Angaben mit Daten verknüpfen, die Google schon über Sie hat.",
    drittland: true,
    drittlandGrundlage: "EU-US Data Privacy Framework und Standardvertragsklauseln",
    datenschutzUrl: "https://policies.google.com/privacy",
    speicher: [{ name: "YSC", art: "cookie", dauer: "Sitzung" }],
    revision: 1,
    rolle: "eigener-verantwortlicher",
    geprueftAm: "2026-11-06",
    alternative: "Video verlinken oder selbst ausliefern; Vorschaubild mit Link statt Einbettung.",
    datenschutzBaustein: "videos",
  },
  "microsoft-bookings": {
    id: "microsoft-bookings",
    art: "einbettung",
    kategorie: "funktional",
    name: "Microsoft Bookings",
    anbieter: "Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland",
    zweck: "Zeigt die Online-Terminbuchung.",
    daten: "Ihre IP-Adresse, die aufgerufene Seite und Angaben zum Gerät. Microsoft kann Cookies setzen. Was Sie in der Buchung eingeben, geht an Microsoft.",
    drittland: true,
    drittlandGrundlage: "EU-US Data Privacy Framework und Standardvertragsklauseln",
    datenschutzUrl: "https://privacy.microsoft.com/de-de/privacystatement",
    speicher: [],
    revision: 1,
    rolle: "auftragsverarbeiter",
    geprueftAm: "2026-11-06",
    alternative: "Link auf die Buchungsseite statt Einbettung.",
    datenschutzBaustein: "terminbuchung",
  },
  // Google-Dienste der Art „skript“ (ab v0.18.0). Einbindung nur über <GoogleTag /> (Consent Mode v2), nie als eigenes <script>.
  // Vorprüfung (Konzept 3a): Für Google Ads ist ein Dritter nicht vermeidbar (die Messung liegt bei Google).
  // Für reine Reichweitenmessung gäbe es Alternativen ohne Drittland (siehe `alternative`).
  // Vor dem ersten Live-Einsatz juristisch gegenlesen (Rolle, Drittland, Speicherdauer).
  "google-analytics": {
    id: "google-analytics",
    art: "skript",
    kategorie: "statistik",
    name: "Google Analytics",
    anbieter: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
    zweck: "Zählt, wie die Website genutzt wird (aufgerufene Seiten, Verweildauer, Herkunft der Besuche), damit wir Inhalte und Anzeigen verbessern können.",
    daten:
      "Ihre IP-Adresse, eine zufällige Kennung in einem Cookie, die aufgerufenen Seiten und Klicks, die Seite, von der Sie kamen, Angaben zu Gerät und Browser und der ungefähre Standort. Geladen wird über den Google Tag Manager.",
    drittland: true,
    drittlandGrundlage: "EU-US Data Privacy Framework und Standardvertragsklauseln",
    datenschutzUrl: "https://policies.google.com/privacy",
    speicher: [
      { name: "_ga", art: "cookie", dauer: "2 Jahre" },
      { name: "_ga_*", art: "cookie", dauer: "2 Jahre" },
    ],
    revision: 1,
    rolle: "auftragsverarbeiter",
    geprueftAm: "2026-11-12",
    alternative: "Cookielose Zählung auf dem eigenen Server (Konzept, Abschnitt 11) oder selbst gehostetes Matomo.",
    datenschutzBaustein: "google-analytics",
  },
  "google-ads": {
    id: "google-ads",
    art: "skript",
    kategorie: "marketing",
    name: "Google Ads (Conversion-Messung)",
    anbieter: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
    zweck: "Misst, ob eine Anfrage über eine unserer Google-Anzeigen zustande kam, damit wir die Anzeigen steuern können.",
    daten:
      "Ihre IP-Adresse, die Kennung des Anzeigenklicks und ein Cookie, die aufgerufenen Seiten, Angaben zu Gerät und Browser und ob Sie eine Anfrage gesendet haben. Google kann die Angaben mit Daten verknüpfen, die Google schon über Sie hat. Geladen wird über den Google Tag Manager.",
    drittland: true,
    drittlandGrundlage: "EU-US Data Privacy Framework und Standardvertragsklauseln",
    datenschutzUrl: "https://policies.google.com/privacy",
    speicher: [
      { name: "_gcl_au", art: "cookie", dauer: "90 Tage" },
      { name: "_gcl_aw", art: "cookie", dauer: "90 Tage" },
    ],
    revision: 1,
    rolle: "eigener-verantwortlicher",
    geprueftAm: "2026-11-12",
    alternative: "Ohne Messung: Anfragen im Posteingang nach Herkunft „Anzeige“ auswerten (dann keine automatische Gebotssteuerung).",
    datenschutzBaustein: "google-ads",
  },
};
