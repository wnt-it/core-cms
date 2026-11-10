'use client'

// Editor für Rechtstexte (Datenschutzerklärung u. Ä.): Titel, Fassung und alle Abschnitte.
// Jede Überschrift bildet mit ihren Absätzen und Listenpunkten eine aufklappbare Gruppe.
// Das Inhaltsverzeichnis entsteht automatisch aus den Überschriften 1 und 2.

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Field, FieldGrid, Input, Note, SaveBar, Section, Segmented, Select } from '../ui/components'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { cx, iconButtonClass, iconButtonDangerClass } from '../ui/styles'
import { saveLegalDocument } from './actions'
import {
  POLICY_LIMITS,
  POLICY_TYPE_LABELS,
  MISSING_REF_TEXT,
  countBrokenRefs,
  countNumberReferences,
  countPlaceholders,
  policyNumbers,
  policyToc,
  refTargets,
  renumberPolicyBlocks,
  resolvePolicyText,
  type LegalDocumentContent,
  type PolicyBlock,
  type PolicyBlockType,
} from './policy'

import AutoTextarea from './AutoTextarea'
import {
  HEAD_TYPES,
  INTRO,
  buildGroups,
  clean,
  hasPlaceholder,
  isHead,
  newId,
  nextSibling,
  numbered,
  plain,
  prevSibling,
  subEnd,
  withIds,
  type Group,
  type Row,
} from './editor-groups'


/** Neue Kennung für ein Verweisziel (Kleinbuchstaben und Ziffern, noch nicht vergeben). */
function newRefId(rows: Row[]): string {
  const used = new Set(rows.map((r) => r.ref))
  let id = ''
  do id = 'r' + Math.random().toString(36).slice(2, 7)
  while (used.has(id) || id.length < 3)
  return id
}

const groupIndent: Record<string, string> = { h1: '', h2: 'sm:ml-5', h3: 'sm:ml-10' }

/** Element im Editor: ein Absatz oder eine Liste (zusammenhängende Listenpunkte, eine Zeile je Punkt). */
type El = { key: number; kind: 'p' | 'list'; rows: Row[] }

function elementsOf(items: Row[]): El[] {
  const els: El[] = []
  for (const r of items) {
    const last = els[els.length - 1]
    if (r.t === 'li' && last?.kind === 'list') last.rows.push(r)
    else els.push({ key: r.id, kind: r.t === 'li' ? 'list' : 'p', rows: [r] })
  }
  return els
}
const elText = (el: El) => el.rows.map((r) => r.text).join('\n')

/** Lage des Elements (erste Zeile = key) in der flachen Liste: [von, bis). */
function elRange(rs: Row[], key: number): [number, number] | null {
  const start = rs.findIndex((r) => r.id === key)
  if (start < 0) return null
  let end = start + 1
  if (rs[start].t === 'li') while (end < rs.length && rs[end].t === 'li') end++
  return [start, end]
}

/** Aufzählungszeichen vor jedem Punkt im Textfeld (wird beim Speichern nicht mitgespeichert). */
const BULLET = '• '
const BULLET_PREFIX = /^(?:•\s?|[-–*]\s+)/
const elDisplay = (el: El) => (el.kind === 'list' ? el.rows.map((r) => BULLET + r.text).join('\n') : elText(el))

/** Stellt sicher, dass jede Zeile mit „• “ beginnt (z. B. nach Enter), und rechnet die Cursor-Stelle um. */
function bulletize(text: string, caret: number): { text: string; caret: number } {
  let inPos = 0
  let outPos = 0
  let delta = 0
  let inside: number | null = null
  const out = text.split('\n').map((line) => {
    const m = line.match(BULLET_PREFIX)
    const prefix = m ? m[0].length : 0
    if (caret >= inPos && caret < inPos + prefix) inside = outPos + BULLET.length
    else if (caret >= inPos + prefix) delta += BULLET.length - prefix
    const next = BULLET + line.slice(prefix)
    inPos += line.length + 1
    outPos += next.length + 1
    return next
  })
  return { text: out.join('\n'), caret: inside ?? caret + delta }
}

/** Listenpunkte aus dem Text des Feldes (eine Zeile je Punkt, mit oder ohne Aufzählungszeichen); vorhandene Ids werden der Reihe nach wiederverwendet. */
function listRows(text: string, old: Row[]): Row[] {
  return text.split('\n').map((line, k) => ({ id: old[k]?.id ?? newId(), t: 'li' as const, text: line.replace(BULLET_PREFIX, '') }))
}

function summary(g: Group): string {
  const els = elementsOf(g.items)
  const p = els.filter((e) => e.kind === 'p').length
  const l = els.filter((e) => e.kind === 'list').length
  const parts = []
  if (p) parts.push(`${p} ${p === 1 ? 'Absatz' : 'Absätze'}`)
  if (l) parts.push(`${l} ${l === 1 ? 'Liste' : 'Listen'}`)
  return parts.length ? parts.join(' · ') : 'Kein Text'
}

export default function LegalDocumentForm({
  slug,
  initial,
  template,
  publicPath,
  fromDatabase,
  numbered: useNumbers = true,
  showVersion = true,
}: {
  slug: string
  initial: LegalDocumentContent
  /** Vorlage aus dem Projekt, auf die zurückgesetzt werden kann. */
  template?: LegalDocumentContent
  /** Öffentliche Seite, z. B. „/datenschutz“ (Link und Neuaufbau nach dem Speichern). */
  publicPath?: string
  /** false: noch nie gespeichert, es wird die Vorlage angezeigt. */
  fromDatabase: boolean
  /** true (Standard): Überschriften automatisch nummerieren, Inhaltsverzeichnis und Verweise. false: schlichter Text, z. B. Impressum. */
  numbered?: boolean
  /** false: kein Feld „Fassung“. */
  showVersion?: boolean
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [version, setVersion] = useState(initial.version)
  const [rows, setRows] = useState<Row[]>(() => withIds(initial.blocks, useNumbers))
  const [isSaved, setIsSaved] = useState(fromDatabase)
  const [saved, setSaved] = useState(initial)
  const [open, setOpen] = useState<Set<number>>(() => new Set())
  const [filter, setFilter] = useState<'all' | 'open'>('all')
  const [confirmReset, setConfirmReset] = useState(false)
    const [saving, startSave] = useTransition()

  const current: LegalDocumentContent = useMemo(() => ({ title, version, blocks: numbered(rows, useNumbers) }), [title, version, rows, useNumbers])
  const labels = useMemo(() => (useNumbers ? policyNumbers(plain(rows)) : rows.map(() => '')), [rows, useNumbers])
  const fixedRefs = useMemo(() => countNumberReferences(current.blocks), [current.blocks])
  const brokenRefs = useMemo(() => countBrokenRefs(current.blocks), [current.blocks])
  const targets = useMemo(() => refTargets(current.blocks), [current.blocks])
  // Zuletzt angeklicktes Textfeld: dort wird ein Verweis eingefügt
  const areas = useRef(new Map<number, HTMLTextAreaElement>())
  const [lastFocus, setLastFocus] = useState<number | null>(null)
  const dirty = !isSaved || JSON.stringify(current) !== JSON.stringify(saved)
  const placeholders = countPlaceholders(current.blocks)
  const toc = useMemo(() => policyToc(current.blocks), [current.blocks])
  const groups = useMemo(() => buildGroups(rows), [rows])
  const emptyHead = rows.some((r) => isHead(r) && !r.text.trim())
  const tooLong = rows.some((r) => r.text.length > POLICY_LIMITS.textLength)

  /** Fügt am Cursor des zuletzt angeklickten Textes einen Verweis auf die Überschrift headId ein. */
  const insertRef = (headId: number) => {
    if (lastFocus === null) return
    const el = areas.current.get(lastFocus)
    const selStart = el?.selectionStart ?? Number.MAX_SAFE_INTEGER
    const selEnd = el?.selectionEnd ?? Number.MAX_SAFE_INTEGER
    setRows((rs) => {
      const head = rs.find((r) => r.id === headId)
      if (!head) return rs
      const refId = head.ref ?? newRefId(rs)
      const token = `{{ref:${refId}}}`
      const withRef = rs.map((r) => (r.id === headId && !r.ref ? { ...r, ref: refId } : r))
      // lastFocus ist die erste Zeile des Elements (Absatz oder Liste)
      const range = elRange(withRef, lastFocus)
      if (!range) return withRef
      const old = withRef.slice(range[0], range[1])
      // Cursor-Stelle bezieht sich auf den angezeigten Text (bei Listen mit Aufzählungszeichen)
      const text = old[0].t === 'li' ? old.map((r) => BULLET + r.text).join('\n') : old.map((r) => r.text).join('\n')
      const a = Math.min(selStart, text.length)
      const b = Math.min(Math.max(selEnd, a), text.length)
      const next = text.slice(0, a) + token + text.slice(b)
      const rowsNew: Row[] = old[0].t === 'li' ? listRows(next, old) : [{ ...old[0], text: next }]
      return [...withRef.slice(0, range[0]), ...rowsNew, ...withRef.slice(range[1])]
    })
    toast.success('Verweis eingefügt. Die Nummer wird automatisch gesetzt.')
  }

  const keyOf = (g: Group) => g.head?.id ?? INTRO
  const toggle = (key: number) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  const expand = (key: number) => setOpen((s) => new Set(s).add(key))

  const update = (id: number, patch: Partial<PolicyBlock>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  /** Absatz oder Liste ändern: Text der Liste hat eine Zeile je Punkt. */
  const setElText = (el: El, text: string) =>
    setRows((rs) => {
      const range = elRange(rs, el.key)
      if (!range) return rs
      const old = rs.slice(range[0], range[1])
      const rowsNew: Row[] = el.kind === 'list' ? listRows(text, old) : [{ ...old[0], text }]
      return [...rs.slice(0, range[0]), ...rowsNew, ...rs.slice(range[1])]
    })

  const removeEl = (el: El) => setRows((rs) => rs.filter((r) => !el.rows.some((x) => x.id === r.id)))

  /** Absatz <-> Liste: Aus einem Absatz wird eine Liste (eine Zeile je Punkt) und umgekehrt. */
  const changeKind = (el: El, kind: 'p' | 'list') => {
    if (kind === el.kind) return
    setRows((rs) => {
      const range = elRange(rs, el.key)
      if (!range) return rs
      const old = rs.slice(range[0], range[1])
      const text = old.map((r) => r.text).join('\n')
      const rowsNew: Row[] = kind === 'list' ? listRows(text, old) : [{ id: old[0].id, t: 'p', text }]
      return [...rs.slice(0, range[0]), ...rowsNew, ...rs.slice(range[1])]
    })
  }

  /** Absatz oder Liste innerhalb ihrer Gruppe verschieben. */
  const moveEl = (g: Group, el: El, dir: -1 | 1) =>
    setRows((rs) => {
      const gs = buildGroups(rs)
      const grp = gs.find((x) => x.items.some((r) => r.id === el.key))
      if (!grp) return rs
      const els = elementsOf(grp.items)
      const i = els.findIndex((e) => e.key === el.key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= els.length) return rs
      const [a, b] = dir === -1 ? [els[j], els[i]] : [els[i], els[j]] // Reihenfolge war a, b
      const aRange = elRange(rs, a.key)!
      const bRange = elRange(rs, b.key)!
      return [...rs.slice(0, aRange[0]), ...rs.slice(bRange[0], bRange[1]), ...rs.slice(aRange[0], aRange[1]), ...rs.slice(bRange[1])]
    })

  /** Gruppe mit allen Unterabschnitten (z. B. 2.4 mit 2.4.1 bis 2.4.3) vor oder hinter den Nachbarabschnitt derselben Ebene setzen. */
  const moveGroup = (g: Group, dir: -1 | 1) =>
    setRows((rs) => {
      const gs = buildGroups(rs)
      const i = gs.findIndex((x) => x.head?.id === g.head?.id)
      const j = dir === -1 ? prevSibling(gs, i) : nextSibling(gs, i)
      if (i < 0 || j < 0) return rs
      const [a, b] = dir === -1 ? [j, i] : [i, j] // a steht danach hinten, b vorne: Reihenfolge war a, b
      const aStart = gs[a].start
      const aEnd = gs[subEnd(gs, a) - 1].end
      const bStart = gs[b].start
      const bEnd = gs[subEnd(gs, b) - 1].end
      return [...rs.slice(0, aStart), ...rs.slice(bStart, bEnd), ...rs.slice(aStart, aEnd), ...rs.slice(bEnd)]
    })

  /** Neuer Absatz oder neue Liste am Ende der Gruppe. */
  const addItem = (g: Group, t: 'p' | 'li') => {
    const row: Row = { id: newId(), t, text: '' }
    setRows((rs) => {
      const gs = buildGroups(rs)
      const grp = gs.find((x) => (x.head?.id ?? null) === (g.head?.id ?? null))
      const copy = rs.slice()
      copy.splice(grp ? grp.end : g.end, 0, row)
      return copy
    })
    expand(keyOf(g))
  }
  /** Neuer Absatz direkt unter einem Absatz oder einer Liste. */
  const addBelow = (g: Group, el: El) => {
    setRows((rs) => {
      const range = elRange(rs, el.key)
      if (!range) return rs
      const copy = rs.slice()
      copy.splice(range[1], 0, { id: newId(), t: 'p', text: '' })
      return copy
    })
    expand(keyOf(g))
  }
  const addGroupAfter = (g: Group | null) => {
    const row: Row = { id: newId(), t: g?.head?.t ?? 'h2', text: '' }
    setRows((rs) => {
      const copy = rs.slice()
      copy.splice(g ? g.end : (buildGroups(rs)[0]?.head ? 0 : buildGroups(rs)[0]?.end ?? 0), 0, row)
      return copy
    })
    expand(row.id)
  }
  const removeGroup = (g: Group) => {
    setRows((rs) => rs.filter((_, i) => i < g.start || i >= g.end))
    setConfirmDelete(null)
  }
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null)

  const reset = () => {
    setTitle(saved.title)
    setVersion(saved.version)
    setRows(withIds(saved.blocks, useNumbers))
  }

  const applyTemplate = () => {
    if (!template) return
    setTitle(template.title)
    setVersion(template.version)
    setRows(withIds(template.blocks, useNumbers))
    setOpen(new Set())
    setConfirmReset(false)
    toast.success('Vorlage geladen. Erst mit „Speichern“ wird sie übernommen.')
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startSave(async () => {
      const res = await saveLegalDocument({ slug, title, version, blocks: current.blocks, publicPath, numbered: useNumbers })
      if (!res.success) {
        toast.error(res.error || 'Fehler beim Speichern.')
        return
      }
      // Leere Abschnitte wurden nicht gespeichert, hier ebenfalls entfernen (Ids bleiben, damit offene Gruppen offen bleiben)
      setRows((rs) => rs.filter((r) => r.text.trim()).map((r) => ({ ...r, text: r.text.trim() })))
      setSaved({ title: title.trim(), version: version.trim(), blocks: useNumbers ? renumberPolicyBlocks(clean(current.blocks)) : clean(current.blocks) })
      setIsSaved(true)
      toast.success('Gespeichert. Die Änderungen sind auf der Website sichtbar.')
      router.refresh()
    })
  }

  const shown = groups.filter((g) => filter === 'all' || g.items.some((r) => hasPlaceholder(r.text)) || (g.head && hasPlaceholder(g.head.text)))
  const allKeys = groups.map(keyOf)
  const allOpen = allKeys.length > 0 && allKeys.every((k) => open.has(k))

  return (
    <form onSubmit={save} className="flex flex-col">
      {!isSaved && (
        <div className="pt-6">
          <Note tone="info">Bisher ist hier nichts gespeichert. Angezeigt wird die Vorlage aus dem Projekt. Mit dem ersten Speichern wird sie zur bearbeitbaren Fassung.</Note>
        </div>
      )}

      <Section title={showVersion ? 'Titel und Fassung' : 'Titel'} description={showVersion ? 'Der Titel steht über dem Text, die Fassung (Datum) darunter.' : 'Der Titel steht über dem Text.'}>
        <FieldGrid>
          <Field label="Titel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={POLICY_LIMITS.titleLength} required />
          </Field>
          {showVersion && (
            <Field label="Fassung" hint="z. B. das Datum der letzten Änderung.">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} maxLength={POLICY_LIMITS.versionLength} placeholder="TT.MM.JJJJ" />
            </Field>
          )}
        </FieldGrid>
        {placeholders > 0 && (
          <Note tone="warn">
            Noch {placeholders} offene{placeholders === 1 ? 'r Platzhalter' : ' Platzhalter'} in eckigen Klammern mit Punkt, z. B. „[● …]“. Auf der Website erscheinen sie gelb markiert. Bitte vor dem Veröffentlichen füllen.
          </Note>
        )}
      </Section>

      {useNumbers && (
      <Section
        title="Inhaltsverzeichnis"
        description="Entsteht automatisch aus den Überschriften 1 und 2 und erscheint so auch auf der Website. Die Nummern werden automatisch nach der Stelle im Text vergeben."
      >
        {toc.length === 0 ? (
          <p className="text-[13.5px] text-[#64748B]">Noch keine Überschriften.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[13.5px]">
            {toc.map((b, i) => (
              <li key={i} className={b.t === 'h2' ? 'pl-5 text-[#334155]' : 'pt-1.5 font-semibold text-[#0F172A]'}>
                {b.text}
              </li>
            ))}
          </ul>
        )}
        {brokenRefs > 0 && (
          <Note tone="error">
            {brokenRefs} Verweis{brokenRefs === 1 ? '' : 'e'} im Text zeigt auf eine gelöschte Überschrift. Auf der Website erscheint dort „{MISSING_REF_TEXT}“. Bitte den Verweis ersetzen oder löschen.
          </Note>
        )}
        {fixedRefs > 0 && (
          <Note tone="warn">
            Im Text gibt es {fixedRefs} fest getippte Verweis{fixedRefs === 1 ? '' : 'e'} auf Nummern (z. B. „siehe 2.5 Kontaktformulare“). Diese passen sich nicht automatisch an. Ersetze sie über „Verweis einfügen“ bei den Abschnitten.
          </Note>
        )}
      </Section>
      )}

      <Section
        title="Abschnitte"
        description={
          useNumbers
            ? 'Jede Überschrift bildet mit ihrem Text eine Gruppe. Gruppen aufklappen, um Absätze und Listenpunkte zu bearbeiten. Mit den Pfeilen wandert die Gruppe samt Unterabschnitten, die Nummern und Verweise passen sich automatisch an.'
            : 'Jede Überschrift bildet mit ihrem Text eine Gruppe. Gruppen aufklappen, um Absätze und Listen zu bearbeiten. Mit den Pfeilen wandert die Gruppe samt Unterabschnitten.'
        }
        bare
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Anzeige"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `Alle (${groups.length})` },
                { value: 'open', label: 'Nur mit Platzhalter' },
              ]}
            />
            <span className="flex-1" />
            {useNumbers && (
            <div className="w-[230px]" title={lastFocus === null ? 'Zuerst in einen Text klicken, dann hier den Verweis wählen.' : 'Fügt den Verweis am Cursor im zuletzt angeklickten Text ein.'}>
              <Select
                value=""
                disabled={lastFocus === null || !rows.some((r) => r.id === lastFocus)}
                onChange={(e) => e.target.value && insertRef(Number(e.target.value))}
                aria-label="Verweis einfügen"
              >
                <option value="" disabled>
                  Verweis einfügen …
                </option>
                {groups
                  .filter((g) => g.head)
                  .map((g) => (
                    <option key={g.head!.id} value={g.head!.id}>
                      {`${labels[g.start].replace(/\.$/, '')} ${g.head!.text}`}
                    </option>
                  ))}
              </Select>
            </div>
            )}
            <Button size="sm" onClick={() => setOpen(allOpen ? new Set() : new Set(allKeys))}>
              {allOpen ? 'Alle zuklappen' : 'Alle aufklappen'}
            </Button>
            <Button size="sm" onClick={() => addGroupAfter(null)}>
              <Plus size={15} /> Abschnitt am Anfang
            </Button>
          </div>

          {shown.length === 0 && (
            <Card>
              <p className="py-6 text-center text-[13.5px] text-[#64748B]">{filter === 'open' ? 'Keine offenen Platzhalter.' : 'Noch keine Abschnitte.'}</p>
            </Card>
          )}

          {shown.map((g) => {
            const key = keyOf(g)
            const isOpen = open.has(key) || filter === 'open'
            const ph = (g.head ? countPlaceholders([g.head]) : 0) + countPlaceholders(g.items)
            const gi = groups.indexOf(g)
            // Feste Abschnitte aus der Vorlage: nur lesen, geändert wird nur die Vorlage im Core
            const locked = g.head ? !!g.head.fest : g.items.length > 0 && g.items.every((r) => r.fest)
            return (
              <div key={key} className={cx('min-w-0', g.head ? groupIndent[g.head.t] : '')}>
                <Card padded={false}>
                  {/* Kopf: Überschrift */}
                  <div className={cx('flex flex-col gap-2 p-3 sm:flex-row sm:items-start', g.head?.t === 'h1' && 'bg-[#FAFAFC] rounded-t-xl')}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Gruppe zuklappen' : 'Gruppe aufklappen'}
                      className={cx(iconButtonClass, 'hidden sm:inline-flex')}
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {g.head ? (
                      <>
                        <div className="w-full shrink-0 sm:w-[140px]">
                          <Select value={g.head.t} disabled={locked} onChange={(e) => update(g.head!.id, { t: e.target.value as PolicyBlockType })} aria-label="Ebene der Überschrift">
                            {HEAD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {POLICY_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {useNumbers && <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums leading-10 text-[#64748B] sm:text-right" aria-label="Nummer">{labels[g.start]}</span>}
                        {/* Mehrzeilig, damit lange Überschriften komplett lesbar sind */}
                        <AutoTextarea
                          value={g.head.text}
                          readOnly={locked}
                          onChange={(e) => update(g.head!.id, { text: e.target.value.replace(/\n/g, ' ') })}
                          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          aria-label="Überschrift"
                          placeholder="Überschrift"
                          maxLength={POLICY_LIMITS.textLength}
                          className={cx('min-w-0 flex-1', g.head.t === 'h1' && 'font-semibold')}
                        />
                      </>
                    ) : (
                      <button type="button" onClick={() => toggle(key)} className="flex-1 text-left text-[14px] font-semibold text-[#0F172A]">
                        Einleitung <span className="font-normal text-[#64748B]">(vor der ersten Überschrift)</span>
                      </button>
                    )}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {locked && <Badge>Vorgabe</Badge>}
                      {ph > 0 && <Badge tone="amber">{ph} offen</Badge>}
                      <button type="button" onClick={() => toggle(key)} className="text-[12.5px] text-[#64748B] hover:text-[#0F172A] sm:hidden">
                        {isOpen ? 'Zuklappen' : 'Aufklappen'}
                      </button>
                    </div>
                    {g.head && !locked && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" className={iconButtonClass} onClick={() => moveGroup(g, -1)} disabled={prevSibling(groups, gi) < 0} aria-label="Gruppe nach oben">
                          <ArrowUp size={16} />
                        </button>
                        <button type="button" className={iconButtonClass} onClick={() => moveGroup(g, 1)} disabled={nextSibling(groups, gi) < 0} aria-label="Gruppe nach unten">
                          <ArrowDown size={16} />
                        </button>
                        <button type="button" className={iconButtonDangerClass} onClick={() => setConfirmDelete(g)} aria-label="Gruppe löschen">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {!isOpen && <p className="border-t border-[#F1F5F9] px-4 py-2 text-[12.5px] text-[#64748B] sm:pl-14">{summary(g)}</p>}

                  {/* Inhalt der Gruppe */}
                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-[#F1F5F9] p-3 sm:pl-14">
                      {locked && <p className="text-[12.5px] text-[#64748B]">Dieser Abschnitt ist für alle Websites gleich und wird von WNT-IT vorgegeben. Er lässt sich hier nicht ändern. Angaben wie die Firma stehen oben bei den Einstellungen der Vorlage.</p>}
                      {g.items.length === 0 && !locked && <p className="text-[13px] text-[#64748B]">Noch kein Text unter dieser Überschrift.</p>}
                      {elementsOf(g.items).map((el, k, all) => {
                        const text = elText(el)
                        const isList = el.kind === 'list'
                        return (
                          <div key={el.key} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="w-full shrink-0 sm:w-[130px]">
                              <Select value={el.kind} disabled={locked} onChange={(e) => changeKind(el, e.target.value as 'p' | 'list')} aria-label="Art des Textes">
                                <option value="p">Absatz</option>
                                <option value="list">Liste</option>
                              </Select>
                            </div>
                            <div className={cx('min-w-0 flex-1', isList && 'sm:ml-4')}>
                              <AutoTextarea
                                value={elDisplay(el)}
                                readOnly={locked}
                                onChange={(e) => {
                                  if (!isList) return setElText(el, e.target.value)
                                  const node = e.target
                                  const fixed = bulletize(node.value, node.selectionStart ?? node.value.length)
                                  setElText(el, fixed.text)
                                  // Cursor nach dem Neuzeichnen an die richtige Stelle setzen (Zeichen wurden ergänzt)
                                  requestAnimationFrame(() => node.setSelectionRange(fixed.caret, fixed.caret))
                                }}
                                aria-label={isList ? 'Liste, ein Punkt pro Zeile' : 'Absatz'}
                                className={cx(hasPlaceholder(text) && 'border-[#FDE68A] bg-[#FFFBEB]')}
                                maxLength={isList ? undefined : POLICY_LIMITS.textLength}
                                elRef={(node) => {
                                  if (node) areas.current.set(el.key, node)
                                  else areas.current.delete(el.key)
                                }}
                                onFocus={() => !locked && setLastFocus(el.key)}
                              />
                              {isList && !locked && <p className="mt-1 text-[12.5px] text-[#64748B]">Jede Zeile mit „•“ ist ein Listenpunkt. Eine neue Zeile (Enter) ergibt einen neuen Punkt.</p>}
                              {text.includes('{{ref:') && (
                                <p className={cx('mt-1 text-[12.5px]', resolvePolicyText(text, targets).includes(MISSING_REF_TEXT) ? 'text-[#B91C1C]' : 'text-[#64748B]')}>
                                  Vorschau: {resolvePolicyText(text, targets)}
                                </p>
                              )}
                            </div>
                            {!locked && <div className="flex shrink-0 items-center gap-0.5">
                              <button type="button" className={iconButtonClass} onClick={() => moveEl(g, el, -1)} disabled={k === 0} aria-label="Nach oben">
                                <ArrowUp size={16} />
                              </button>
                              <button type="button" className={iconButtonClass} onClick={() => moveEl(g, el, 1)} disabled={k === all.length - 1} aria-label="Nach unten">
                                <ArrowDown size={16} />
                              </button>
                              <button type="button" className={iconButtonClass} onClick={() => addBelow(g, el)} aria-label="Darunter einen Absatz einfügen">
                                <Plus size={16} />
                              </button>
                              <button type="button" className={iconButtonDangerClass} onClick={() => removeEl(el)} aria-label={isList ? 'Liste löschen' : 'Absatz löschen'}>
                                <Trash2 size={16} />
                              </button>
                            </div>}
                          </div>
                        )
                      })}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!locked && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => addItem(g, 'p')}>
                              <Plus size={15} /> Absatz
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => addItem(g, 'li')}>
                              <Plus size={15} /> Liste
                            </Button>
                          </>
                        )}
                        <span className="flex-1" />
                        <Button size="sm" variant="ghost" onClick={() => addGroupAfter(g)}>
                          <Plus size={15} /> Abschnitt darunter
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
        {emptyHead && <div className="mt-3"><Note tone="warn">Mindestens eine Überschrift ist leer. Bitte ausfüllen oder die Gruppe löschen.</Note></div>}
      </Section>

      <SaveBar
        start={
          template ? (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={saving}>
              <RotateCcw size={15} /> Auf Vorlage zurücksetzen
            </Button>
          ) : (
            <span className="text-[13px] text-[#64748B]">Änderungen sind nach dem Speichern sofort sichtbar.</span>
          )
        }
      >
        {publicPath && (
          <a href={publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-[14px] font-medium text-[#334155] hover:bg-[#F1F5F9]">
            Seite ansehen
          </a>
        )}
        <Button variant="ghost" onClick={reset} disabled={!dirty || saving}>
          Verwerfen
        </Button>
        <Button type="submit" variant="primary" disabled={saving || !dirty || !title.trim() || tooLong || emptyHead || rows.length === 0}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Speichern
        </Button>
      </SaveBar>

      <ConfirmDialog
        open={confirmReset}
        title="Auf die Vorlage zurücksetzen?"
        confirmLabel="Vorlage laden"
        onConfirm={applyTemplate}
        onCancel={() => setConfirmReset(false)}
      >
        Alle Änderungen im Editor werden durch die Vorlage aus dem Projekt ersetzt. Gespeichert wird erst mit „Speichern“.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Gruppe löschen?"
        confirmLabel="Löschen"
        onConfirm={() => confirmDelete && removeGroup(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      >
        Die Überschrift „{confirmDelete?.head?.text}“ wird mit allen {confirmDelete?.items.length ?? 0} Texten darunter gelöscht. Gespeichert wird erst mit „Speichern“, bis dahin hilft „Verwerfen“.
      </ConfirmDialog>
    </form>
  )
}
