// Typen für das Einwilligungs-Feature (Cookie-Banner / Zwei-Klick-Lösung).
// Reine Typen, kein React und kein Server-Zugriff.

/** Einbettung: lädt erst nach Klick am Inhalt (Zwei-Klick). Skript: läuft seitenweit, braucht den Banner. */
export type ServiceArt = "einbettung" | "skript";
export type ServiceKategorie = "funktional" | "statistik" | "marketing";
/** auftragsverarbeiter: AV-Vertrag (Art. 28) nötig. gemeinsam: Vereinbarung nach Art. 26. eigener-verantwortlicher: Anbieter entscheidet selbst. */
export type ServiceRolle = "auftragsverarbeiter" | "gemeinsam" | "eigener-verantwortlicher";

export interface ServiceStorage {
  name: string;
  art: "cookie" | "localStorage" | "sessionStorage";
  /** Freitext, z. B. „6 Monate“ */
  dauer: string;
}

/** Ein Dienst, in den der Besucher einwilligen kann. */
export interface ConsentService {
  /** Kennung, nur Kleinbuchstaben, Ziffern und Bindestrich. */
  id: string;
  art: ServiceArt;
  kategorie: ServiceKategorie;
  name: string;
  /** Anbieter mit ladungsfähiger Anschrift. */
  anbieter: string;
  /** Wozu der Dienst eingesetzt wird, in einfacher Sprache. */
  zweck: string;
  /** Welche Daten beim Laden übertragen werden. */
  daten: string;
  /** Daten gehen (auch) in ein Land außerhalb der EU/des EWR. */
  drittland: boolean;
  /** Rechtsgrundlage der Übermittlung, Pflicht bei drittland. */
  drittlandGrundlage?: string;
  datenschutzUrl: string;
  /** Was der Dienst auf dem Gerät ablegt (für Aufräumen bei Widerruf und für die Datenschutzerklärung). */
  speicher: ServiceStorage[];
  /** Wird nur bei WESENTLICHEN Änderungen (neuer Zweck, Anbieter, Drittland) erhöht und löst eine neue Frage aus. */
  revision: number;
  rolle: ServiceRolle;
  /** Datum der letzten rechtlichen Prüfung (JJJJ-MM-TT). Der Admin warnt nach 12 Monaten. */
  geprueftAm: string;
  /** Datenschutzfreundlichere Alternative (Hinweis für Entwickler, nicht für Besucher). */
  alternative?: string;
  /** Kennung des passenden Abschnitts der Datenschutz-Vorlage (ab Phase 2). */
  datenschutzBaustein?: string;
}

export type ConsentMode = "einbettung" | "banner" | "aus";
export type ConsentPlacement = "leiste-unten" | "karte-links" | "dialog-mitte";

export interface ConsentDesign {
  /** Akzentfarbe (Hex) für Fokus und Schalter. Die Buttons selbst sind immer identisch gestaltet. */
  akzent?: string;
  /** Eckenrundung in px. */
  rundung?: number;
  platzierung?: ConsentPlacement;
}

/** Eingabe im Projekt (consent.config.ts). */
export interface ConsentConfigInput {
  /** einbettung (Standard bei reinen Einbettungen), banner (nötig bei Skripten), aus. */
  modus?: ConsentMode;
  dienste: Array<ConsentService | string>;
  design?: ConsentDesign;
  /** Seiten, auf denen nie ein Banner erscheint (Standard: /datenschutz, /impressum). */
  rechtsseiten?: string[];
  datenschutzUrl?: string;
  impressumUrl?: string;
  /** Adresse des Protokoll-Endpunkts. Standard: /api/consent. */
  endpunkt?: string;
  /** schwebend: kleiner fester Button „Cookie-Einstellungen“ (Standard). footer: nur über <ConsentSettingsLink /> im Footer. */
  einstellungenButton?: "schwebend" | "footer";
}

export interface ResolvedConsentConfig {
  modus: ConsentMode;
  dienste: ConsentService[];
  design: Required<ConsentDesign>;
  rechtsseiten: string[];
  datenschutzUrl: string;
  impressumUrl: string;
  endpunkt: string;
  einstellungenButton: "schwebend" | "footer";
}

/** Auswahl je Dienst. Fehlt ein Dienst, ist darüber noch nicht entschieden. */
export type ConsentChoices = Record<string, boolean>;

/** Was im Browser liegt (localStorage „cms_consent“). Nur Status je Dienst, keine ID. */
export interface StoredConsent {
  v: 1;
  /** Zeitpunkt der Entscheidung (ms) */
  at: number;
  /** Ablauf (ms) */
  exp: number;
  /** Entscheidung je Dienst */
  c: ConsentChoices;
  /** Entscheidungs-Schlüssel je Dienst (id@revision), damit wesentliche Änderungen neu gefragt werden */
  k: Record<string, string>;
}

export type ConsentAction = "accept_all" | "reject_all" | "custom";
export type ConsentTrigger = "banner" | "settings" | "embed";

/** Was der Browser an den Endpunkt schickt. */
export interface ConsentEventPayload {
  action: ConsentAction;
  trigger: ConsentTrigger;
  choices: ConsentChoices;
  pagePath?: string;
}
