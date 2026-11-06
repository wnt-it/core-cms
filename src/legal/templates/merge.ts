// Holt die Vorlage in den Text der Datenschutzerklärung. Ohne React und Server.
// Die Vorlage besteht nur aus festen Abschnitten. Beim Holen werden genau diese Abschnitte ersetzt,
// alle anderen Abschnitte bleiben unverändert an ihrer Stelle (hinter dem Abschnitt, hinter dem sie stehen).

import { resolvePolicyRefs, stripHeadingNumber, type PolicyBlock } from "../policy";

/** Frühere Überschriften aus der Vorlage: Texte ohne Markierung fest werden daran als Vorlagen-Abschnitt erkannt. */
const FRUEHERE_TITEL: Record<string, string> = {
  "Hosting, Betrieb und Infrastruktur der Webseiten": "Hosting, Betrieb und Sicherheit der Webseiten",
  "Kontaktformulare und Anfragen": "Kontaktformular und Anfragen",
};

type Chunk = { head: PolicyBlock | null; blocks: PolicyBlock[] };

const isHead = (b: PolicyBlock) => b.t !== "p" && b.t !== "li";
const titleOf = (b: PolicyBlock) => stripHeadingNumber(b.text).trim();

/** Teilt den Text in Abschnitte: eine Überschrift mit allem bis zur nächsten Überschrift; davor die Einleitung (head: null). */
function toChunks(blocks: PolicyBlock[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const b of blocks) {
    if (isHead(b)) chunks.push({ head: b, blocks: [b] });
    else if (chunks.length === 0) chunks.push({ head: null, blocks: [b] });
    else chunks[chunks.length - 1].blocks.push(b);
  }
  return chunks;
}

/** Ersetzt die Abschnitte der Vorlage im Text. Die Einleitung gehört zur Vorlage. Ist noch kein Text da, gilt die Vorlage. */
export function mergeDatenschutz(aktuell: PolicyBlock[], vorlage: PolicyBlock[]): PolicyBlock[] {
  const neu = toChunks(vorlage);
  const indexOfTitle = new Map<string, number>();
  neu.forEach((c, i) => {
    if (c.head) indexOfTitle.set(titleOf(c.head), i);
  });

  const eigene = new Map<number, PolicyBlock[]>(); // Stelle in der Vorlage (-1: ganz vorne) -> eigene Blöcke dahinter
  const refs = new Map<number, string>(); // Verweis-Kennungen, die im Text auf Vorlagen-Überschriften gesetzt wurden
  let anchor = neu[0]?.head ? -1 : 0;

  for (const c of toChunks(aktuell)) {
    if (!c.head) continue;
    const title = titleOf(c.head);
    const index = indexOfTitle.get(FRUEHERE_TITEL[title] ?? title);
    if (index !== undefined) {
      anchor = index;
      if (c.head.ref) refs.set(index, c.head.ref);
    } else if (!c.head.fest) {
      eigene.set(anchor, [...(eigene.get(anchor) ?? []), ...c.blocks]);
    }
    // fest und nicht mehr in der Vorlage: Abschnitt entfällt
  }

  const blocks: PolicyBlock[] = [...(eigene.get(-1) ?? [])];
  neu.forEach((c, i) => {
    const ref = refs.get(i);
    blocks.push(...c.blocks.map((b) => (b === c.head && ref && !b.ref ? { ...b, ref } : b)));
    blocks.push(...(eigene.get(i) ?? []));
  });
  return blocks;
}

export interface VorlageAenderung {
  /** Überschrift des Abschnitts in der Vorlage */
  titel: string;
  /** Frühere Überschrift, wenn sie sich ändert */
  frueher?: string;
  /** Bisheriger Text des Abschnitts; leer: Abschnitt ist neu */
  alt: string;
  /** Neuer Text des Abschnitts; leer: Abschnitt entfällt */
  neu: string;
}

export interface VorlageVorschau {
  /** Nur Abschnitte der Vorlage, die sich wirklich ändern */
  aenderungen: VorlageAenderung[];
  /** Überschriften der eigenen Abschnitte, die unverändert bleiben */
  eigene: string[];
}

const chunkText = (c: Chunk) => c.blocks.filter((b) => !isHead(b)).map((b) => (b.t === "li" ? `• ${b.text.trim()}` : b.text.trim())).join("\n");

/** Zeigt, was mergeDatenschutz ändern würde. Verweise sind eingesetzt, damit der Vergleich lesbar ist. */
export function vorschauDatenschutz(aktuell: PolicyBlock[], vorlage: PolicyBlock[]): VorlageVorschau {
  const merged = toChunks(resolvePolicyRefs(mergeDatenschutz(aktuell, vorlage)));
  const isTemplate = (c: Chunk) => (c.head ? !!c.head.fest : true);
  const bisher = new Map<string, { titel: string; text: string; fest: boolean }>();
  for (const c of toChunks(resolvePolicyRefs(aktuell))) {
    const titel = c.head ? titleOf(c.head) : "";
    bisher.set(FRUEHERE_TITEL[titel] ?? titel, { titel, text: chunkText(c), fest: !!c.head?.fest });
  }

  const aenderungen: VorlageAenderung[] = [];
  const eigene: string[] = [];
  const inVorlage = new Set<string>();
  for (const c of merged) {
    const titel = c.head ? titleOf(c.head) : "";
    if (!isTemplate(c)) {
      eigene.push(titel);
      continue;
    }
    inVorlage.add(titel);
    const alt = bisher.get(titel);
    const neu = chunkText(c);
    const frueher = alt && alt.titel !== titel ? alt.titel : undefined;
    // Reine Zeilenumbrüche zählen nicht als Änderung, in der Vorschau wären sie unsichtbar
    const gleich = alt && alt.text.replace(/\s+/g, " ") === neu.replace(/\s+/g, " ");
    if (!alt || !gleich || frueher) aenderungen.push({ titel: titel || "Einleitung", frueher, alt: alt?.text ?? "", neu });
  }
  for (const [key, alt] of bisher) {
    if (alt.fest && !inVorlage.has(key)) aenderungen.push({ titel: alt.titel, alt: alt.text, neu: "" });
  }
  return { aenderungen, eigene };
}

export type WordDiffPart = { type: "gleich" | "neu" | "weg"; text: string };

const MAX_DIFF_TOKENS = 3000;

/** Wortweiser Vergleich zweier Texte, für die Anzeige, was sich geändert hat. */
export function wordDiff(alt: string, neu: string): WordDiffPart[] {
  const a = alt.match(/\s+|[^\s]+/g) ?? [];
  const b = neu.match(/\s+|[^\s]+/g) ?? [];
  if (a.length * b.length > MAX_DIFF_TOKENS * MAX_DIFF_TOKENS) return [{ type: "weg", text: alt }, { type: "neu", text: neu }];
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: WordDiffPart[] = [];
  const push = (type: WordDiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last?.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push("gleich", a[i]);
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      push("neu", b[j++]);
    } else {
      push("weg", a[i++]);
    }
  }
  return lesbar(parts);
}

/** Einzelne gleiche Wörter zwischen Änderungen zählen mit zur Änderung, sonst wird ein umformulierter Satz unlesbar. */
function lesbar(parts: WordDiffPart[]): WordDiffPart[] {
  const out: WordDiffPart[] = [];
  let weg = "";
  let neu = "";
  const flush = () => {
    if (weg) out.push({ type: "weg", text: weg });
    if (neu) out.push({ type: "neu", text: neu });
    weg = neu = "";
  };
  parts.forEach((p, i) => {
    if (p.type === "weg") weg += p.text;
    else if (p.type === "neu") neu += p.text;
    else if ((weg || neu) && i < parts.length - 1 && p.text.trim().split(/\s+/).length <= 2) {
      weg += p.text;
      neu += p.text;
    } else {
      flush();
      out.push(p);
    }
  });
  flush();
  return out;
}
