// Reine Helfer für den Posteingang (Anzeige, Filter). Ohne React, damit sie sich einzeln testen lassen.

import type { Submission, SubmissionFile } from '../supabase/types'

export const ATTACHMENT_BUCKET = 'anfragen'

export const STATUS_OPTIONS = [
  { value: 'Neu', label: 'Neu', tone: 'red' },
  { value: 'In Bearbeitung', label: 'In Bearbeitung', tone: 'amber' },
  { value: 'Erledigt', label: 'Erledigt', tone: 'green' },
] as const

export type StatusValue = (typeof STATUS_OPTIONS)[number]['value']

/** Status-Eintrag für die Anzeige; unbekannte Werte erscheinen wie „Neu“. */
export const statusOf = (status: string) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]

export const FILE_STATUS: Record<SubmissionFile['status'], string> = {
  ausstehend: 'nicht vollständig hochgeladen',
  ok: '',
  abgelehnt: 'abgelehnt (Dateityp oder Größe passte nicht), gelöscht',
}

/** Anzeigename: Name, sonst E-Mail, sonst Hinweis */
export const senderOf = (s: Submission) => s.name?.trim() || s.email?.trim() || 'Ohne Namen'

/** Formular ohne Zusatz, z. B. „Kontakt“ aus „Kontakt · Startseite“ */
export const baseType = (type: string) => type.split(' · ')[0].trim() || type

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const mailtoHref = (sub: Submission) =>
  sub.email ? `mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject || 'Ihre Anfrage')}` : null

/** Vorhandene Formulare mit Anzahl, alphabetisch, für den Filter */
export function countFormTypes(submissions: Submission[]): [string, number][] {
  const counts: Record<string, number> = {}
  for (const s of submissions) {
    const t = baseType(s.type)
    counts[t] = (counts[t] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0], 'de'))
}

export interface SubmissionFilter {
  query: string
  type: string // 'all' oder Formular
  status: string // 'all' oder Status
}

export function filterSubmissions(submissions: Submission[], { query, type, status }: SubmissionFilter): Submission[] {
  const q = query.toLowerCase().trim()
  return submissions.filter((s) => {
    if (type !== 'all' && baseType(s.type) !== type) return false
    if (status !== 'all' && s.status !== status) return false
    if (q === '') return true
    return [s.name, s.email, s.company, s.subject, s.source_page, s.message].some((v) => v?.toLowerCase().includes(q))
  })
}

/** Neue Einträge anhängen, ohne doppelte (gleiche id) */
export function appendUnique<T extends { id: string }>(prev: T[], more: T[]): T[] {
  const seen = new Set(prev.map((p) => p.id))
  return [...prev, ...more.filter((m) => !seen.has(m.id))]
}
