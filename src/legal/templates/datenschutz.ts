// Vorlage der Datenschutzerklärung für alle core-cms-Kundenprojekte (WNT-IT).
// Der TEXT steht in datenschutz-vorlage.json (einzige Quelle). Projekte lesen die Datei vom Branch live (vorlage-remote.ts),
// eine Textänderung braucht also kein Release, nur einen Merge nach live. Hier steht nur, wie der Text gebaut wird.
// Aufbau und Formulierungen folgen dem WNT-IT-Regelwerk (siehe docs/RECHTSTEXTE.md).
//
// Die Vorlage enthält nur die festen Basis-Bausteine: Allgemeines, Hosting, E-Mail, Cookies, Kontaktformular, Rechte (mit Änderungsklausel).
// Sie sind im Editor gesperrt (fest: true) und werden nur in der JSON-Datei geändert. „Text aus Vorlage holen“ ersetzt genau diese Abschnitte (merge.ts).
// Alles andere (Karten, Videos, Newsletter, KI-Agent ...) trägt der Kunde bzw. WNT-IT im Admin als eigenen Abschnitt ein, das bleibt beim Holen erhalten.
// Spätere Bausteine: docs/DATENSCHUTZ_BAUSTEINE_SPAETER.md und BACKLOG.md.
// Projektangaben (Firma, Anschrift, Kontakt ...) kommen aus DatenschutzConfig und ersetzen die %Platzhalter% im Text.
// Offene Punkte stehen als [● …] im Text und werden im Editor gelb markiert.

import { renumberPolicyBlocks, type LegalDocumentContent, type PolicyBlock } from "../policy";
import { AUFSICHTSBEHOERDEN, aufsichtText } from "./aufsichtsbehoerden";

import BUNDLED_JSON from "./datenschutz-vorlage.json";
import { parseVorlageText, type DatenschutzVorlageText } from "./vorlage-text";

/** Mitgelieferte Fassung des Textes (Stand dieser Core-Version). Die neueste Fassung liest der Server aus dem Repo (vorlage-remote.ts). */
export const BUNDLED_VORLAGE: DatenschutzVorlageText = (() => {
  const parsed = parseVorlageText(BUNDLED_JSON);
  if (!parsed) throw new Error("datenschutz-vorlage.json ist ungültig");
  return parsed;
})();

/** Version der mitgelieferten Vorlage. Für den Stand im Admin die Fassung aus getDatenschutzVorlageText() nehmen. */
export const DATENSCHUTZ_TEMPLATE_VERSION = BUNDLED_VORLAGE.version;
export const DATENSCHUTZ_TEMPLATE_CHANGES = BUNDLED_VORLAGE.changes;

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

// ───────────── Hilfen ─────────────

/** Angabe oder, wenn leer, ein gelber Platzhalter. */
const val = (v: string | undefined, label: string) => (v && v.trim() ? v.trim() : `[● ${label}]`);

/** Markiert Blöcke als fest: im Editor gesperrt, beim Holen der Vorlage ersetzt. */
const fest = (blocks: PolicyBlock[]): PolicyBlock[] => blocks.map((b) => ({ ...b, fest: true }));

/** Ersetzt %name% in allen Texten. */
function fill(blocks: PolicyBlock[], vars: Record<string, string>): PolicyBlock[] {
  return blocks.map((b) => ({ ...b, text: b.text.replace(/%([a-zA-Z]+)%/g, (m, k: string) => (k in vars ? vars[k] : m)) }));
}

/**
 * Entfernt die Überschrift mit dieser Kennung samt Text bis zur nächsten Überschrift gleicher oder höherer Ebene.
 * Verweise darauf in anderen Abschnitten fallen mit weg: ein Klammerzusatz „(… siehe …)“ nur als Klammer, sonst der ganze Satz.
 */
function ohneAbschnitt(blocks: PolicyBlock[], ref: string): PolicyBlock[] {
  const start = blocks.findIndex((b) => b.ref === ref);
  if (start < 0) return blocks;
  const ebene = (t: string) => (t === "h1" ? 1 : t === "h2" ? 2 : t === "h3" ? 3 : 9);
  const eigene = ebene(blocks[start].t);
  let ende = start + 1;
  while (ende < blocks.length && ebene(blocks[ende].t) > eigene) ende++;

  const token = `{{ref:${ref}}}`;
  const klammer = new RegExp(`\\s*\\([^()]*\\{\\{ref:${ref}\\}\\}[^()]*\\)`, "g");
  const satz = new RegExp(`\\s*[^.!?]*\\{\\{ref:${ref}\\}\\}[^.!?]*[.!?]?`, "g");
  return [...blocks.slice(0, start), ...blocks.slice(ende)].flatMap((b) => {
    if (!b.text.includes(token)) return [b];
    const text = b.text.replace(klammer, "").replace(satz, "").trim();
    return text ? [{ ...b, text }] : [];
  });
}

/** Platzhalter, die der Text verwenden darf. Eine Vorlage mit anderen wird abgelehnt (vorlage-text.ts). */
export const VORLAGE_PLATZHALTER = ["domains", "email", "dsEmail", "firma", "ort", "bundesland", "aufsicht"] as const;
export const VORLAGE_MARKER = ["@@ADRESSE@@", "@@ANSPRECHPARTNER@@"] as const;

/**
 * Baut die Datenschutzerklärung aus den Bausteinen und den Projektangaben. Die Überschriften sind nach ihrer
 * Stelle nummeriert; Verweise ({{ref:…}}) zeigen auf Überschriften mit Kennung.
 */
export function buildDatenschutz(input: Partial<DatenschutzConfig>, vorlage: DatenschutzVorlageText = BUNDLED_VORLAGE): LegalDocumentContent {
  const c: DatenschutzConfig = { ...DEFAULT_DATENSCHUTZ_CONFIG, ...input };

  const adresse = [val(c.firma, "Firma"), val(c.strasse, "Straße"), `${val(c.plz, "PLZ")} ${val(c.ort, "Ort")}`];
  const vars: Record<string, string> = {
    domains: c.domains.trim() ? c.domains.trim() : "[● Domains der Webseiten]",
    email: val(c.email, "E-Mail-Adresse"),
    dsEmail: val(c.datenschutzEmail, "E-Mail-Adresse für den Datenschutz"),
    firma: val(c.firma, "Firma"),
    ort: val(c.ort, "Ort"),
    bundesland: val(c.bundesland, "Bundesland"),
    aufsicht: val(aufsichtText(c.bundesland), "Bundesland für die Aufsichtsbehörde wählen"),
  };

  const ansprechpartner = [
    "Ansprechpartner für den Datenschutz beim Verantwortlichen",
    `${val(c.firma, "Firma")}${c.datenschutzbeauftragter.trim() ? ` (Datenschutzbeauftragter: ${c.datenschutzbeauftragter.trim()})` : ""}, ${val(c.strasse, "Straße")}, ${val(c.plz, "PLZ")} ${val(c.ort, "Ort")}`,
    vars.dsEmail,
  ].join("\n");
  // Telefon ist freiwillig: ohne Angabe fällt die Zeile weg (kein Platzhalter)
  const telefon = c.telefon.trim() ? [`Telefon: ${c.telefon.trim()}`] : [];
  const verantwortlicher = [...adresse, ...telefon, `E-Mail: ${vars.email}`].join("\n");

  const replaceMarker = (blocks: PolicyBlock[], marker: string, replacement: PolicyBlock[]) =>
    blocks.flatMap((b) => (b.text === marker ? replacement : [b]));

  let blocks = replaceMarker(vorlage.blocks, "@@ADRESSE@@", [{ t: "p", text: verantwortlicher }]);
  for (const [schalter, ref] of Object.entries(ABWAEHLBARE_ABSCHNITTE) as [AbwaehlbarerAbschnitt, string][]) {
    if (!c[schalter]) blocks = ohneAbschnitt(blocks, ref);
  }
  blocks = replaceMarker(blocks, "@@ANSPRECHPARTNER@@", [{ t: "p", text: ansprechpartner }]);

  const fassung = c.fassung.trim() || new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return {
    title: `Datenschutzerklärung ${c.kurzname.trim() || val("", "Kurzname")} Webseiten`,
    version: fassung,
    blocks: renumberPolicyBlocks(fest(fill(blocks, vars))),
  };
}
