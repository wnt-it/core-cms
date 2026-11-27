// Google-Dienste nur für die Tests. Die echten Texte legt jedes Projekt selbst in seiner consent.config.ts fest (ab v0.18.0 nicht mehr im Katalog).

import type { ConsentService } from "../../src/consent/types";

export const GOOGLE_TEST_DIENSTE: Record<"google-analytics" | "google-ads", ConsentService> = {
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
