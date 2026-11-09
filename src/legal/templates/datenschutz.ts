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
import { aufsichtText } from "./aufsichtsbehoerden";
import { ABWAEHLBARE_ABSCHNITTE, DEFAULT_DATENSCHUTZ_CONFIG, type AbwaehlbarerAbschnitt, type DatenschutzConfig } from "./datenschutz-config";

export * from "./datenschutz-config";

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
