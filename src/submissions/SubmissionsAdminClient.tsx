'use client'

// Quelle: template/src/app/admin/(dashboard)/submissions/SubmissionsAdminClient.tsx
// Imports auf core-cms-interne relative Pfade umgestellt; generische mailto-Betreffzeile
// (kein hartcodierter Firmenname mehr).

import { useState, useTransition, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Submission } from '../supabase/types'
import { createClient } from '../supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Mail, ChevronDown, X, Inbox } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Menu,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  buttonClass,
  cx,
  iconButtonClass,
  iconButtonDangerClass,
  tableClass,
  tdClass,
  thClass,
  trClass,
} from '../ui'

interface SubmissionsAdminClientProps {
  initialSubmissions: Submission[]
}

const STATUS_OPTIONS = [
  { value: 'Neu', label: 'Neu', tone: 'red' },
  { value: 'In Bearbeitung', label: 'In Bearbeitung', tone: 'amber' },
  { value: 'Erledigt', label: 'Erledigt', tone: 'green' },
] as const

type StatusValue = (typeof STATUS_OPTIONS)[number]['value']

// Formular ohne Zusatz, z. B. „Kontakt“ aus „Kontakt · Richard Prinz“
const baseType = (type: string) => type.split(" · ")[0].trim() || type

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function SubmissionsAdminClient({ initialSubmissions }: SubmissionsAdminClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null)
  // Eintrag, dessen Löschen gerade bestätigt werden soll
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setSubmissions(initialSubmissions)
  }, [initialSubmissions])

  // Detailansicht mit ESC schließen (nicht, solange der Löschdialog offen ist)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!deleteTarget) setActiveSubmission(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteTarget])

  // Vorhandene Formulare mit Anzahl, für den Filter
  const formTypes = Object.entries(
    submissions.reduce<Record<string, number>>((acc, s) => {
      const t = baseType(s.type)
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => a[0].localeCompare(b[0], "de"))

  const filteredSubmissions = submissions.filter((s) => {
    const matchesType = typeFilter === 'all' || baseType(s.type) === typeFilter
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.company && s.company.toLowerCase().includes(q)) ||
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      (s.source_page && s.source_page.toLowerCase().includes(q)) ||
      (s.message && s.message.toLowerCase().includes(q))
    return matchesType && matchesStatus && matchesSearch
  })

  // Status ändern
  const updateStatus = async (id: string, newStatus: 'Neu' | 'In Bearbeitung' | 'Erledigt') => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)))
    if (activeSubmission?.id === id) {
      setActiveSubmission((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    startTransition(async () => {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        toast.error('Fehler beim Aktualisieren: ' + error.message)
        router.refresh()
      } else {
        toast.success(`Status auf „${newStatus}“ gesetzt`)
      }
    })
  }

  // Eintrag öffnen: neue Anfragen gelten damit als gesehen (Status „In Bearbeitung“)
  const openSubmission = (sub: Submission) => {
    if (sub.status !== 'Neu') {
      setActiveSubmission(sub)
      return
    }
    const seen = { ...sub, status: 'In Bearbeitung' as const }
    setActiveSubmission(seen)
    setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? seen : s)))
    startTransition(async () => {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'In Bearbeitung', updated_at: new Date().toISOString() })
        .eq('id', sub.id)
      if (error) {
        toast.error('Fehler beim Aktualisieren: ' + error.message)
        router.refresh()
      }
    })
  }

  // Löschen: erst Bestätigungsdialog öffnen
  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)

    setSubmissions((prev) => prev.filter((s) => s.id !== id))
    if (activeSubmission?.id === id) setActiveSubmission(null)

    startTransition(async () => {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Fehler beim Löschen: ' + error.message)
        router.refresh()
      } else {
        toast.success('Eintrag gelöscht')
      }
    })
  }

  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  const getStatusObj = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
  }

  // Zeile per Tastatur öffnen
  const onRowKeyDown = (e: ReactKeyboardEvent, sub: Submission) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSubmission(sub)
    }
  }

  const mailtoHref = (sub: Submission) =>
    `mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject || 'Ihre Anfrage')}`

  const toolbar = (
    <>
      <SearchInput
        placeholder="Absender, E-Mail, Firma, Herkunft oder Text suchen"
        aria-label="Anfragen durchsuchen"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Select
        aria-label="Formular"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="w-full sm:w-auto sm:min-w-[200px]"
      >
        <option value="all">Alle Formulare ({submissions.length})</option>
        {formTypes.map(([type, count]) => (
          <option key={type} value={type}>
            {type} ({count})
          </option>
        ))}
      </Select>
      <div className="max-w-full overflow-x-auto">
        <Segmented
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: 'all', label: 'Alle' }, ...STATUS_OPTIONS.map((o) => ({ value: o.value as string, label: o.label }))]}
        />
      </div>
    </>
  )

  const empty = (
    <EmptyState
      icon={<Inbox size={20} aria-hidden="true" />}
      title={submissions.length === 0 ? 'Keine Formulareingänge vorhanden.' : 'Keine passenden Anfragen gefunden.'}
      description={submissions.length === 0 ? undefined : 'Suche oder Filter anpassen.'}
    />
  )

  return (
    <>
      <TableCard toolbar={toolbar}>
        {filteredSubmissions.length === 0 ? (
          empty
        ) : (
          <>
            {/* Ab Tablet: Tabelle */}
            <table className={cx(tableClass, 'hidden xl:table')}>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>Absender</th>
                  <th scope="col" className={thClass}>Anliegen</th>
                  <th scope="col" className={thClass}>Formular</th>
                  <th scope="col" className={thClass}>Eingang</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={cx(thClass, 'w-12')}><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => {
                  const currentStatusObj = getStatusObj(sub.status)
                  const isSelected = activeSubmission?.id === sub.id

                  return (
                    <tr
                      key={sub.id}
                      tabIndex={0}
                      onClick={() => openSubmission(sub)}
                      onKeyDown={(e) => onRowKeyDown(e, sub)}
                      className={cx(
                        trClass,
                        'cursor-pointer outline-none focus-visible:bg-[#F1F5F9]',
                        isSelected && 'bg-[#FAFAFC]',
                      )}
                    >
                      {/* Absender */}
                      <td className={tdClass}>
                        <span className={cx('block max-w-[200px] truncate', sub.status === 'Neu' ? 'font-semibold' : 'font-medium')}>{sub.name}</span>
                        <span className="block max-w-[200px] truncate text-[13px] text-[#64748B]">{sub.email}</span>
                        {sub.phone && <span className="block text-[12.5px] text-[#94A3B8]">{sub.phone}</span>}
                      </td>

                      {/* Betreff & Vorschau */}
                      <td className={tdClass}>
                        <span className="block max-w-[230px] truncate">{sub.subject || 'Kein Betreff'}</span>
                        <span className="block max-w-[230px] truncate text-[13px] text-[#64748B]">{sub.message || '–'}</span>
                      </td>

                      {/* Formular & Herkunft */}
                      <td className={cx(tdClass, 'text-[13px] text-[#64748B]')}>
                        <span className="block max-w-[150px] truncate" title={sub.type}>{sub.type}</span>
                        {sub.source_page && (
                          <span className="block max-w-[160px] truncate text-[12.5px] text-[#94A3B8]" title={sub.source_page}>
                            {sub.source_page.split('(')[0].trim()}
                          </span>
                        )}
                      </td>

                      {/* Datum */}
                      <td className={cx(tdClass, 'whitespace-nowrap text-[13px] tabular-nums text-[#64748B]')}>
                        {formatDate(sub.created_at)}
                      </td>

                      {/* Status mit Auswahlmenü */}
                      <td className={cx(tdClass, 'whitespace-nowrap')} onClick={(e) => e.stopPropagation()}>
                        <Menu
                          label={`Status: ${currentStatusObj.label} – ändern`}
                          width={180}
                          trigger={(open) => (
                            <Badge tone={currentStatusObj.tone} dot>
                              {currentStatusObj.label}
                              <ChevronDown size={12} aria-hidden="true" className={cx('opacity-60 transition-transform', open && 'rotate-180')} />
                            </Badge>
                          )}
                          items={STATUS_OPTIONS.map((opt) => ({
                            label: <Badge tone={opt.tone} dot>{opt.label}</Badge>,
                            checked: sub.status === opt.value,
                            onSelect: () => updateStatus(sub.id, opt.value),
                          }))}
                        />
                      </td>

                      {/* Aktionen */}
                      <td className={cx(tdClass, 'text-right')} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className={iconButtonDangerClass}
                          aria-label={`Anfrage von ${sub.name} löschen`}
                          title="Löschen"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Handy: Liste */}
            <ul className="divide-y divide-[#F1F5F9] xl:hidden">
              {filteredSubmissions.map((sub) => {
                const st = getStatusObj(sub.status)
                return (
                  <li key={sub.id}>
                    <button
                      type="button"
                      onClick={() => openSubmission(sub)}
                      className="flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left outline-none hover:bg-[#FAFAFC] focus-visible:bg-[#F1F5F9]"
                    >
                      <span className="flex items-center gap-2">
                        <span className={cx('min-w-0 flex-1 truncate text-[14px] text-[#0F172A]', sub.status === 'Neu' ? 'font-semibold' : 'font-medium')}>
                          {sub.name}
                        </span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </span>
                      <span className="truncate text-[14px] text-[#0F172A]">{sub.subject || 'Kein Betreff'}</span>
                      <span className="truncate text-[13px] text-[#64748B]">{sub.message || '–'}</span>
                      <span className="text-[12.5px] tabular-nums text-[#94A3B8]">
                        {sub.type} · {formatDate(sub.created_at)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </TableCard>

      {/* Detailansicht (Seitenleiste rechts) */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={() => setActiveSubmission(null)}
            className="absolute inset-0 bg-[rgba(15,23,42,.28)]"
            aria-hidden="true"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-[#E2E8F0] bg-white shadow-[-12px_0_40px_rgba(15,23,42,.08)]"
          >
            {/* Kopf */}
            <div className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
              <Badge>{activeSubmission.type}</Badge>
              <span className="mr-auto truncate text-[13px] tabular-nums text-[#64748B]">
                {new Date(activeSubmission.created_at).toLocaleString('de-DE')}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(activeSubmission.id, activeSubmission.name)}
                className={iconButtonDangerClass}
                aria-label="Anfrage löschen"
                title="Anfrage löschen"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSubmission(null)}
                className={iconButtonClass}
                aria-label="Schließen (Esc)"
                title="Schließen (Esc)"
                autoFocus
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Inhalt */}
            <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-4 py-6 sm:px-6">
              {/* Betreff & Herkunft */}
              <div>
                <h2 id="submission-title" className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A]">
                  {activeSubmission.subject || `${activeSubmission.type}-Anfrage`}
                </h2>
                <p className="mt-1 break-words text-[13px] text-[#64748B]">
                  <span className="sr-only">Herkunft: </span>
                  {activeSubmission.source_page || 'Kontaktseite (/kontakt)'}
                  {activeSubmission.source_url && <> · {activeSubmission.source_url}</>}
                </p>
              </div>

              {/* Bearbeitungsstatus */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#334155]">Status</span>
                <div className="max-w-full overflow-x-auto">
                  <Segmented
                    label="Bearbeitungsstatus"
                    value={activeSubmission.status as StatusValue}
                    onChange={(v) => updateStatus(activeSubmission.id, v)}
                    options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </div>
              </div>

              {/* Kontaktdaten */}
              <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 text-[14px] sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-y-2">
                <dt className="text-[13px] text-[#64748B]">Name</dt>
                <dd className="m-0 mb-2 text-[#0F172A] sm:mb-0">{activeSubmission.name}</dd>

                <dt className="text-[13px] text-[#64748B]">E-Mail</dt>
                <dd className="m-0 mb-2 break-all sm:mb-0">
                  <a href={mailtoHref(activeSubmission)} className="text-[#0F172A] underline decoration-[#CBD5E1] underline-offset-2 hover:decoration-current">
                    {activeSubmission.email}
                  </a>
                </dd>

                {activeSubmission.phone && (
                  <>
                    <dt className="text-[13px] text-[#64748B]">Telefon</dt>
                    <dd className="m-0 mb-2 sm:mb-0">
                      <a href={`tel:${activeSubmission.phone}`} className="text-[#0F172A] underline decoration-[#CBD5E1] underline-offset-2 hover:decoration-current">
                        {activeSubmission.phone}
                      </a>
                    </dd>
                  </>
                )}

                {activeSubmission.company && (
                  <>
                    <dt className="text-[13px] text-[#64748B]">Firma</dt>
                    <dd className="m-0 mb-2 text-[#0F172A] sm:mb-0">{activeSubmission.company}</dd>
                  </>
                )}
              </dl>

              {/* Nachricht */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[#334155]">Nachricht</span>
                {activeSubmission.message ? (
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#1E293B]">{activeSubmission.message}</p>
                ) : (
                  <p className="text-[14px] italic text-[#94A3B8]">Keine zusätzliche Nachricht übermittelt.</p>
                )}
              </div>

              {/* Dynamische Zusatzdaten (z. B. Projektdaten, Checkboxen, Sonderfelder) */}
              {activeSubmission.metadata && Object.keys(activeSubmission.metadata).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-[#334155]">Zusätzliche Formular- &amp; Projektdaten</span>
                  <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-[#FAFAFC] px-4 py-3.5 text-[14px] sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-y-2">
                    {Object.entries(activeSubmission.metadata).map(([key, val]) => (
                      <div key={key} className="contents">
                        <dt className="text-[13px] capitalize text-[#64748B]">{key.replace(/_/g, ' ')}</dt>
                        <dd className="m-0 mb-2 break-words text-[#0F172A] sm:mb-0">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Fuß */}
            <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] bg-[#FAFAFC] px-4 py-3.5 sm:px-6">
              <Button variant="ghost" onClick={() => setActiveSubmission(null)}>
                Schließen
              </Button>
              <a href={mailtoHref(activeSubmission)} className={buttonClass('primary', 'md', 'flex-1 sm:flex-none')}>
                <Mail size={16} aria-hidden="true" />
                Per E-Mail antworten
              </a>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Anfrage löschen?"
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      >
        Eintrag von „{deleteTarget?.name}“ wirklich löschen?
      </ConfirmDialog>
    </>
  )
}
