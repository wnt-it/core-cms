// Gemeinsame Typen und reine Hilfsfunktionen für Rechtstexte (Datenschutzerklärung u. Ä.).
// Ohne React und ohne Server-Zugriff, damit Editor (Client), Speichern (Server) und die
// Website-Seite dieselben Regeln nutzen.

export type PolicyBlockType = "h1" | "h2" | "h3" | "p" | "li";

/** h1 = Hauptabschnitt, h2 = Unterabschnitt, h3 = Unterpunkt, p = Absatz, li = Listenpunkt (gehört zum davorstehenden Absatz). */
export interface PolicyBlock {
  t: PolicyBlockType;
  text: string;
  /** Nur Überschriften: feste Kennung, auf die Verweise im Text zeigen ({{ref:kennung}}). Bleibt beim Umnummerieren gleich. */
  ref?: string;
}

/** Erlaubte Kennung eines Verweisziels (Kleinbuchstaben und Ziffern). */
export const REF_ID_PATTERN = /^[a-z0-9]{2,24}$/;

export interface LegalDocumentContent {
  title: string;
  /** Fassung, z. B. „04.11.2026“ */
  version: string;
  blocks: PolicyBlock[];
}

export interface LegalDocument extends LegalDocumentContent {
  slug: string;
  /** true: aus der Datenbank, false: Vorlage aus dem Projekt (noch nie gespeichert). */
  fromDatabase: boolean;
  updatedAt: string | null;
}

export const POLICY_BLOCK_TYPES: PolicyBlockType[] = ["h1", "h2", "h3", "p", "li"];

export const POLICY_TYPE_LABELS: Record<PolicyBlockType, string> = {
  h1: "Überschrift 1",
  h2: "Überschrift 2",
  h3: "Überschrift 3",
  p: "Absatz",
  li: "Listenpunkt",
};

export const POLICY_LIMITS = { blocks: 600, textLength: 8000, titleLength: 200, versionLength: 60 } as const;

/** Platzhalter im Format [● …] (offene Punkte, die vor dem Veröffentlichen gefüllt werden). */
export const PLACEHOLDER_SOURCE = "\\[●[^\\]]*\\]";

export function countPlaceholders(blocks: PolicyBlock[]): number {
  return blocks.reduce((sum, b) => sum + (b.text.match(new RegExp(PLACEHOLDER_SOURCE, "g"))?.length ?? 0), 0);
}

export function isPolicyBlock(value: unknown): value is PolicyBlock {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const refOk = v.ref === undefined || v.ref === null || (typeof v.ref === "string" && REF_ID_PATTERN.test(v.ref));
  return typeof v.text === "string" && typeof v.t === "string" && (POLICY_BLOCK_TYPES as string[]).includes(v.t) && refOk;
}

/** Übernimmt nur gültige Blöcke (Typ, Text, ggf. Kennung), alles andere wird verworfen. */
export function toPolicyBlocks(value: unknown): PolicyBlock[] {
  return Array.isArray(value)
    ? value.filter(isPolicyBlock).map((b) => (b.ref ? { t: b.t, text: b.text, ref: b.ref } : { t: b.t, text: b.text }))
    : [];
}

/** Verweis im Text: {{ref:kennung}} wird zu „2.5 „Überschrift““ (Nummer und Titel der Ziel-Überschrift). */
export const REF_TOKEN_SOURCE = "\\{\\{ref:([a-z0-9]{2,24})\\}\\}";
export const MISSING_REF_TEXT = "[● Verweis fehlt]";

/** Kennung -> „2.5 „Titel““ für alle Überschriften mit Kennung (Nummern nach Stelle in der Liste). */
export function refTargets(blocks: PolicyBlock[]): Map<string, string> {
  const numbers = policyNumbers(blocks);
  const map = new Map<string, string>();
  blocks.forEach((b, i) => {
    if (b.ref && numbers[i]) map.set(b.ref, `${numbers[i].replace(/\.$/, "")} „${stripHeadingNumber(b.text)}“`);
  });
  return map;
}

export function resolvePolicyText(text: string, targets: Map<string, string>): string {
  return text.replace(new RegExp(REF_TOKEN_SOURCE, "g"), (_m, id: string) => targets.get(id) ?? MISSING_REF_TEXT);
}

/** Setzt alle Verweise ein. Für die Anzeige auf der Website; gespeichert bleiben die Verweise als {{ref:…}}. */
export function resolvePolicyRefs(blocks: PolicyBlock[]): PolicyBlock[] {
  const targets = refTargets(blocks);
  return blocks.map((b) => (b.text.includes("{{ref:") ? { ...b, text: resolvePolicyText(b.text, targets) } : b));
}

/** Zählt Verweise, deren Ziel-Überschrift es nicht (mehr) gibt. */
export function countBrokenRefs(blocks: PolicyBlock[]): number {
  const targets = refTargets(blocks);
  const re = new RegExp(REF_TOKEN_SOURCE, "g");
  return blocks.reduce((sum, b) => sum + [...b.text.matchAll(re)].filter((m) => !targets.has(m[1])).length, 0);
}

/** Anker aus der Nummerierung einer Überschrift, z. B. „2.1.1 Karten“ -> „ds-2-1-1“. Ohne Nummer: undefined. */
export function policyAnchor(heading: string, prefix = "ds"): string | undefined {
  const m = heading.match(/^(\d+(?:\.\d+)*)\.?\s/);
  return m ? `${prefix}-${m[1].replace(/\./g, "-")}` : undefined;
}

/** Inhaltsverzeichnis: alle Überschriften der Ebenen 1 und 2. */
export function policyToc(blocks: PolicyBlock[]): PolicyBlock[] {
  return blocks.filter((b) => b.t === "h1" || b.t === "h2");
}

export type PolicyGroup = { type: "h1" | "h2" | "h3" | "p"; text: string } | { type: "ul"; items: string[] };

/** Listenpunkte (li) werden zu einer Liste gruppiert. */
export function groupPolicyBlocks(blocks: PolicyBlock[]): PolicyGroup[] {
  return blocks.reduce<PolicyGroup[]>((acc, b) => {
    if (b.t === "li") {
      const last = acc[acc.length - 1];
      if (last?.type === "ul") last.items.push(b.text);
      else acc.push({ type: "ul", items: [b.text] });
    } else {
      acc.push({ type: b.t, text: b.text });
    }
    return acc;
  }, []);
}

const NUMBER_PREFIX = /^\d+(?:\.\d+)*\.?\s+/;

/** Überschrifttext ohne führende Nummer, z. B. „2.1 Hosting“ -> „Hosting“. */
export function stripHeadingNumber(text: string): string {
  return text.replace(NUMBER_PREFIX, "");
}

/** Nummer je Block in der Reihenfolge der Liste (1. / 1.1 / 1.1.1); für Absätze und Listenpunkte leer. */
export function policyNumbers(blocks: PolicyBlock[]): string[] {
  const n = [0, 0, 0];
  return blocks.map((b) => {
    if (b.t !== "h1" && b.t !== "h2" && b.t !== "h3") return "";
    const level = b.t === "h1" ? 0 : b.t === "h2" ? 1 : 2;
    n[level] += 1;
    for (let i = level + 1; i < n.length; i++) n[i] = 0;
    return n.slice(0, level + 1).join(".") + (level === 0 ? "." : "");
  });
}

/**
 * Setzt die Nummern der Überschriften nach ihrer Stelle in der Liste (alte Nummern im Text werden ersetzt).
 * Verweise im Fließtext („siehe 2.5“) werden dabei NICHT angepasst.
 */
export function renumberPolicyBlocks(blocks: PolicyBlock[]): PolicyBlock[] {
  const numbers = policyNumbers(blocks);
  return blocks.map((b, i) => (numbers[i] ? { ...b, text: `${numbers[i]} ${stripHeadingNumber(b.text)}` } : b));
}

/** Zählt Verweise auf Nummern im Fließtext, z. B. „siehe 2.5“ oder „Abschnitt 2.4.1“ (werden nicht automatisch angepasst). */
export function countNumberReferences(blocks: PolicyBlock[]): number {
  const re = /\b\d+\.\d+(?:\.\d+)*\s*[\u201E"]/g;
  return blocks.reduce((sum, b) => (b.t === "p" || b.t === "li" ? sum + (b.text.match(re)?.length ?? 0) : sum), 0);
}
