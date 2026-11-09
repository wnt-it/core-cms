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
};
