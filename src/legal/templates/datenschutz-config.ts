// Angaben und Bausteine der Datenschutz-Vorlage, ohne den Vorlagentext selbst.
// Der Editor im Browser (TemplatePanel) braucht nur das hier. datenschutz.ts lädt zusätzlich die 29-KB-Vorlage.

import { AUFSICHTSBEHOERDEN } from "./aufsichtsbehoerden";

export interface DatenschutzConfig {
  /** Kurzname für den Titel, z. B. „Alb-Naturenergie“ → „Datenschutzerklärung Alb-Naturenergie Webseiten“ */
  kurzname: string;
  /** Fassung (Datum) unter dem Titel, z. B. „04.11.2026“. Leer: heutiges Datum beim Erzeugen. */
  fassung: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  /** E-Mail-Adresse für Datenschutzanfragen */
  datenschutzEmail: string;
  /** Name und Anschrift des Datenschutzbeauftragten, falls bestellt (sonst leer: Platzhalter im Text) */
  datenschutzbeauftragter: string;
  /** Alle Domains der Webseiten, z. B. „alb-naturenergie.com und alb-naturenergie.de“ */
  domains: string;
  /** Bundesland des Sitzes: bestimmt die Aufsichtsbehörde im Text (siehe aufsichtsbehoerden.ts) */
  bundesland: string;
  /** Abschnitt „Cookies und Einwilligungsmanagement“ in den Text aufnehmen. Abwählen, wenn die Website keine einwilligungspflichtigen Dienste nutzt. */
  cookies: boolean;
  /** Abschnitt „Kontaktformular und Anfragen“ in den Text aufnehmen. Abwählen, wenn die Website kein Kontaktformular hat. */
  kontaktformular: boolean;
}

/** Abschnitte der Vorlage, die sich im Admin abwählen lassen: Schalter in DatenschutzConfig -> Kennung (ref) der Überschrift. */
export const ABWAEHLBARE_ABSCHNITTE = { cookies: "cookies", kontaktformular: "kontaktformulare" } as const;
export type AbwaehlbarerAbschnitt = keyof typeof ABWAEHLBARE_ABSCHNITTE;

export const DEFAULT_DATENSCHUTZ_CONFIG: DatenschutzConfig = {
  kurzname: "",
  fassung: "",
  firma: "",
  strasse: "",
  plz: "",
  ort: "",
  telefon: "",
  email: "",
  datenschutzEmail: "",
  datenschutzbeauftragter: "",
  domains: "",
  bundesland: "",
  cookies: true,
  kontaktformular: true,
};

const TEXT_KEYS = [
  "kurzname", "fassung", "firma", "strasse", "plz", "ort", "telefon", "email", "datenschutzEmail", "datenschutzbeauftragter",
  "domains",
] as const;

/** Prüft beliebige Eingaben und macht daraus eine vollständige Konfiguration (unbekannte Felder entfallen, Texte werden gekürzt). */
export function normalizeDatenschutzConfig(raw: unknown): DatenschutzConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: DatenschutzConfig = { ...DEFAULT_DATENSCHUTZ_CONFIG };
  for (const k of TEXT_KEYS) if (typeof src[k] === "string") out[k] = (src[k] as string).trim().slice(0, 1000);
  // Nur bekannte Bundesländer: Ein älterer Freitext ergibt im Text einen Platzhalter statt einer falschen Behörde
  out.bundesland = typeof src.bundesland === "string" && Object.hasOwn(AUFSICHTSBEHOERDEN, src.bundesland) ? src.bundesland : "";
  // Fehlt die Angabe (ältere Einstellungen), bleibt der Abschnitt drin
  for (const k of Object.keys(ABWAEHLBARE_ABSCHNITTE) as AbwaehlbarerAbschnitt[]) out[k] = src[k] !== false;
  return out;
}

/** Die Bausteine der Vorlage (im Admin sichtbar). Nur Bausteine mit schalter lassen sich abwählen. */
export const DATENSCHUTZ_STANDARD_BAUSTEINE: { label: string; hint: string; schalter?: AbwaehlbarerAbschnitt }[] = [
  { label: "Allgemeine Informationen", hint: "Fest vorgegeben. Verantwortlicher, Umfang, Speicherdauer, Drittländer, verlinkte Webseiten." },
  { label: "Hosting, Betrieb und Sicherheit", hint: "Fest vorgegeben. Betrieb der Webseiten durch den Auftragsverarbeiter." },
  { label: "Versand von E-Mails", hint: "Fest vorgegeben. Allgemein beschrieben, ohne Namen des Dienstes." },
  { label: "Cookies und Einwilligungsmanagement", hint: "Allgemeine Infos zu Cookies und zum Cookie-Banner. Welche Cookies ein Dienst setzt, steht in dessen eigenem Abschnitt. Ausschalten, wenn die Website keine einwilligungspflichtigen Dienste (z. B. Karten, Videos, Statistik) nutzt.", schalter: "cookies" },
  { label: "Kontaktformular und Anfragen", hint: "Gilt nur für das Standard-Kontaktformular. Andere Formulare brauchen einen eigenen Abschnitt. Ausschalten, wenn die Website kein Kontaktformular hat.", schalter: "kontaktformular" },
  { label: "Ihre Rechte und Änderung", hint: "Fest vorgegeben. Betroffenenrechte, Aufsichtsbehörde, Änderungsklausel." },
];

/** Platzhalter, die der Text verwenden darf. Eine Vorlage mit anderen wird abgelehnt (vorlage-text.ts). */
export const VORLAGE_PLATZHALTER = ["domains", "email", "dsEmail", "firma", "ort", "bundesland", "aufsicht"] as const;
export const VORLAGE_MARKER = ["@@ADRESSE@@", "@@ANSPRECHPARTNER@@"] as const;
