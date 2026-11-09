// Prüft den Text der Datenschutz-Vorlage (datenschutz-vorlage.json), egal ob mitgeliefert oder aus dem Repo geladen.
// Ohne React und Server. Ungültige Fassungen werden abgelehnt, dann gilt die mitgelieferte.

import { POLICY_LIMITS, isPolicyBlock, type PolicyBlock } from "../policy";

export interface DatenschutzVorlageText {
  /** z. B. „2026-11-05.3“ (Datum, optional mit laufender Nummer) */
  version: string;
  /** Neueste zuerst */
  changes: { version: string; text: string }[];
  blocks: PolicyBlock[];
}

const VERSION = /^(\d{4}-\d{2}-\d{2})(?:\.(\d{1,3}))?$/;
const ERLAUBT = new Set(["domains", "email", "dsEmail", "firma", "ort", "bundesland", "aufsicht"]);
const MARKER = ["@@ADRESSE@@", "@@ANSPRECHPARTNER@@"];

/** Vergleicht zwei Vorlagen-Versionen: > 0, wenn a neuer ist. Ungültige Angaben gelten als älteste. */
export function compareVorlageVersion(a: string | null | undefined, b: string | null | undefined): number {
  const pa = a ? VERSION.exec(a) : null;
  const pb = b ? VERSION.exec(b) : null;
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  if (pa[1] !== pb[1]) return pa[1] < pb[1] ? -1 : 1;
  return Number(pa[2] ?? 0) - Number(pb[2] ?? 0);
}

/** Gültige Vorlage oder null. Prüft Aufbau, Längen, erlaubte %Platzhalter% und Verweisziele. */
export function parseVorlageText(raw: unknown): DatenschutzVorlageText | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string" || !VERSION.test(r.version)) return null;
  if (!Array.isArray(r.changes) || !Array.isArray(r.blocks)) return null;
  if (r.blocks.length === 0 || r.blocks.length > POLICY_LIMITS.blocks || r.changes.length > 200) return null;

  const changes: DatenschutzVorlageText["changes"] = [];
  for (const c of r.changes) {
    if (!c || typeof c !== "object") return null;
    const { version, text } = c as Record<string, unknown>;
    if (typeof version !== "string" || !VERSION.test(version) || typeof text !== "string" || text.length > 4000) return null;
    changes.push({ version, text });
  }

  const blocks: PolicyBlock[] = [];
  for (const b of r.blocks) {
    if (!isPolicyBlock(b) || b.text.length === 0 || b.text.length > POLICY_LIMITS.textLength) return null;
    for (const m of b.text.matchAll(/%([a-zA-Z]+)%/g)) if (!ERLAUBT.has(m[1])) return null;
    blocks.push({ t: b.t, text: b.text, ...(b.ref ? { ref: b.ref } : {}) });
  }
  // Pflichtangaben zum Verantwortlichen müssen genau einmal vorkommen
  for (const marker of MARKER) if (blocks.filter((b) => b.text === marker).length !== 1) return null;
  // Jeder Verweis braucht eine Überschrift mit dieser Kennung, Kennungen sind eindeutig
  const refs = blocks.flatMap((b) => (b.ref ? [b.ref] : []));
  if (new Set(refs).size !== refs.length) return null;
  for (const b of blocks) for (const m of b.text.matchAll(/\{\{ref:([a-z0-9]{2,24})\}\}/g)) if (!refs.includes(m[1])) return null;

  return { version: r.version, changes, blocks };
}
