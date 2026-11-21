// Reine Logik des Rechtstext-Editors (ohne React, testbar): Zeilen mit IDs, Gruppen aus Überschrift und
// folgendem Text, Ebenen und Nachbarn für Verschieben. Vorher Teil von LegalDocumentForm.tsx.

import {
  PLACEHOLDER_SOURCE,
  renumberPolicyBlocks,
  stripHeadingNumber,
  type PolicyBlock,
  type PolicyBlockType,
} from './policy'

export type Row = PolicyBlock & { id: number }
export type Group = { head: Row | null; items: Row[]; start: number; end: number }

export const INTRO = -1
export const HEAD_TYPES: PolicyBlockType[] = ['h1', 'h2', 'h3']
export const BODY_TYPES: PolicyBlockType[] = ['p', 'li']
export const isHead = (r: Row) => r.t === 'h1' || r.t === 'h2' || r.t === 'h3'
export const hasPlaceholder = (text: string) => new RegExp(PLACEHOLDER_SOURCE).test(text)

let nextId = 1
/** Neue, eindeutige ID für eine Zeile im Editor (nur im Browser, wird nicht gespeichert). */
export const newId = () => nextId++
// Im Editor stehen Überschriften ohne Nummer; die Nummer ergibt sich aus der Stelle in der Liste und wird beim Speichern (und in der Anzeige) gesetzt.
export const withIds = (blocks: PolicyBlock[], strip = true): Row[] =>
  blocks.map((b) => ({ ...b, text: strip && b.t.startsWith('h') ? stripHeadingNumber(b.text) : b.text, id: nextId++ }))
export const plain = (rows: Row[]): PolicyBlock[] => rows.map(({ t, text, ref, fest }) => ({ t, text, ...(ref ? { ref } : {}), ...(fest ? { fest: true } : {}) }))
/** Stand wie gespeichert: Überschriften mit Nummer. */
export const numbered = (rows: Row[], on = true): PolicyBlock[] => (on ? renumberPolicyBlocks(plain(rows)) : plain(rows))
export const clean = (blocks: PolicyBlock[]) => blocks.map((b) => ({ ...b, text: b.text.trim() })).filter((b) => b.text)

/** Teilt die Liste in Gruppen: eine Überschrift mit allem, was bis zur nächsten Überschrift folgt. */
export function buildGroups(rows: Row[]): Group[] {
  const groups: Group[] = []
  rows.forEach((r, i) => {
    if (isHead(r)) groups.push({ head: r, items: [], start: i, end: i + 1 })
    else {
      if (groups.length === 0) groups.push({ head: null, items: [], start: 0, end: 0 })
      const g = groups[groups.length - 1]
      g.items.push(r)
      g.end = i + 1
    }
  })
  return groups
}

/** Ebene einer Gruppe: Einleitung 0, Überschrift 1 bis 3. */
export const level = (g: Group) => (g.head ? Number(g.head.t[1]) : 0)
/** Ende (exklusiv) der Gruppe i samt ihren Unterabschnitten. */
export const subEnd = (gs: Group[], i: number) => {
  let e = i + 1
  while (e < gs.length && level(gs[e]) > level(gs[i])) e++
  return e
}
/** Vorherige bzw. nächste Gruppe derselben Ebene unter demselben Elternabschnitt, sonst -1. */
export const prevSibling = (gs: Group[], i: number) => {
  for (let j = i - 1; j >= 0; j--) {
    if (level(gs[j]) === level(gs[i])) return j
    if (level(gs[j]) < level(gs[i])) return -1
  }
  return -1
}
export const nextSibling = (gs: Group[], i: number) => {
  const e = subEnd(gs, i)
  return e < gs.length && level(gs[e]) === level(gs[i]) ? e : -1
}
