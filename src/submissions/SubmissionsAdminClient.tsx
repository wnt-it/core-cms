'use client'

// Posteingang (Core-Seite). Name und E-Mail sind keine Pflicht (ab v0.15.0), Zusatzfelder erscheinen mit
// ihrer Bezeichnung aus field_labels, Anhänge liegen im privaten Speicherbereich und werden nur über kurz
// gültige Links und nach einem Warnhinweis heruntergeladen.
// Aufbau: diese Datei hält Zustand und Datenbank-Aufrufe, SubmissionsList zeigt die Liste,
// SubmissionDetail die geöffnete Anfrage, submission-view.ts enthält die reinen Helfer.

import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Submission, SubmissionFile } from '../supabase/types'
import { createClient } from '../supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Inbox } from 'lucide-react'
import { Button, EmptyState, Note, SearchInput, Segmented, Select, TableCard } from '../ui/components'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SUBMISSIONS_PAGE } from './paging'
import SubmissionsList from './SubmissionsList'
import SubmissionDetail from './SubmissionDetail'
import { ATTACHMENT_BUCKET, STATUS_OPTIONS, appendUnique, countFormTypes, filterSubmissions, notifySubmissionsChanged, type StatusValue } from './submission-view'

interface SubmissionsAdminClientProps {
  initialSubmissions: Submission[]
  initialFiles?: SubmissionFile[]
  /** Anzahl aller Anfragen in der Datenbank; mehr als geladen: Knopf „Ältere laden“ */
  totalCount?: number
}

// Fester Standardwert: ein neues [] bei jedem Render würde den Abgleich-Effekt endlos auslösen
const NO_FILES: SubmissionFile[] = []
const NOW = () => new Date().toISOString()

export default function SubmissionsAdminClient({ initialSubmissions, initialFiles = NO_FILES, totalCount }: SubmissionsAdminClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [total, setTotal] = useState(totalCount ?? initialSubmissions.length)
  const [loadingMore, setLoadingMore] = useState(false)
  const [files, setFiles] = useState<SubmissionFile[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  // Anhang, dessen Herunterladen gerade bestätigt werden soll
  const [downloadTarget, setDownloadTarget] = useState<SubmissionFile | null>(null)
  // Eintrag, dessen Löschen gerade bestätigt werden soll
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => setSubmissions(initialSubmissions), [initialSubmissions])
  useEffect(() => setTotal(totalCount ?? initialSubmissions.length), [totalCount, initialSubmissions])
  useEffect(() => setFiles(initialFiles), [initialFiles])

  // Detailansicht gleitet herein und wieder hinaus: erst nach dem Einhängen öffnen, beim Schließen erst nach der Animation aushängen
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setActiveSubmission(null), 260)
  }, [])
  const showSubmission = (sub: Submission) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveSubmission(sub)
    // Zwei Frames warten, damit die Ansicht erst geschlossen gezeichnet wird und dann hereingleitet
    requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)))
  }
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  // Detailansicht mit ESC schließen (nicht, solange ein Dialog offen ist)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteTarget && !downloadTarget) closePanel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteTarget, downloadTarget, closePanel])

  // Anhänge je Anfrage (einmal gruppiert statt bei jeder Zeile neu zu suchen)
  const filesById = useMemo(() => {
    const map = new Map<string, SubmissionFile[]>()
    for (const f of files) map.set(f.submission_id, [...(map.get(f.submission_id) ?? []), f])
    return map
  }, [files])
  const filesOf = (id: string) => filesById.get(id) ?? NO_FILES

  const formTypes = useMemo(() => countFormTypes(submissions), [submissions])
  const filteredSubmissions = useMemo(
    () => filterSubmissions(submissions, { query: searchQuery, type: typeFilter, status: statusFilter }),
    [submissions, searchQuery, typeFilter, statusFilter],
  )

  // Ältere Anfragen seitenweise nachladen, mit ihren Anhängen
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const from = submissions.length
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + SUBMISSIONS_PAGE - 1)
      if (error) throw error
      const more = (data ?? []) as Submission[]
      const ids = more.map((s) => s.id)
      if (ids.length) {
        const { data: moreFiles } = await supabase.from('submission_files').select('*').in('submission_id', ids).order('created_at')
        setFiles((prev) => appendUnique(prev, (moreFiles ?? []) as SubmissionFile[]))
      }
      setSubmissions((prev) => appendUnique(prev, more))
      if (more.length < SUBMISSIONS_PAGE) setTotal(from + more.length)
    } catch (err) {
      toast.error('Ältere Anfragen konnten nicht geladen werden' + (err instanceof Error ? ': ' + err.message : ''))
    } finally {
      setLoadingMore(false)
    }
  }
  const hasMore = submissions.length < total

  // Status in der Liste und in der offenen Ansicht setzen, dann speichern
  const saveStatus = (id: string, status: StatusValue, notify: boolean) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
    setActiveSubmission((prev) => (prev?.id === id ? { ...prev, status } : prev))
    startTransition(async () => {
      const { error } = await supabase.from('submissions').update({ status, updated_at: NOW() }).eq('id', id)
      if (error) {
        toast.error('Fehler beim Aktualisieren: ' + error.message)
        router.refresh()
        return
      }
      notifySubmissionsChanged()
      if (notify) toast.success(`Status auf „${status}“ gesetzt`)
    })
  }
  const updateStatus = (id: string, status: StatusValue) => saveStatus(id, status, true)

  // Eintrag öffnen: neue Anfragen gelten damit als gesehen (Status „In Bearbeitung“)
  const openSubmission = (sub: Submission) => {
    if (sub.status !== 'Neu') return showSubmission(sub)
    showSubmission({ ...sub, status: 'In Bearbeitung' })
    saveStatus(sub.id, 'In Bearbeitung', false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)

    setSubmissions((prev) => prev.filter((s) => s.id !== id))
    if (activeSubmission?.id === id) closePanel()
    const paths = filesOf(id).map((f) => f.path)
    setFiles((prev) => prev.filter((f) => f.submission_id !== id))
    setTotal((n) => Math.max(0, n - 1))

    startTransition(async () => {
      // Anhänge zuerst löschen, die Einträge in submission_files gehen mit der Anfrage.
      // Alles im Ordner der Anfrage, auch Dateien ohne Eintrag (z. B. abgebrochene Uploads)
      const { data: listed } = await supabase.storage.from(ATTACHMENT_BUCKET).list(id, { limit: 1000 })
      const all = [...new Set([...paths, ...(listed ?? []).map((o) => `${id}/${o.name}`)])]
      if (all.length) {
        const { error: storageError } = await supabase.storage.from(ATTACHMENT_BUCKET).remove(all)
        if (storageError) {
          toast.error('Anhänge konnten nicht gelöscht werden: ' + storageError.message)
          router.refresh()
          return
        }
      }
      const { error } = await supabase.from('submissions').delete().eq('id', id)
      if (error) {
        toast.error('Fehler beim Löschen: ' + error.message)
        router.refresh()
      } else {
        notifySubmissionsChanged()
        toast.success('Eintrag gelöscht')
      }
    })
  }

  const openDelete = useCallback((id: string, name: string) => setDeleteTarget({ id, name }), [])
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  // Herunterladen erst nach Hinweis. Der Link gilt eine Minute und lädt immer als Datei (nie im Browser anzeigen).
  const confirmDownload = async () => {
    const file = downloadTarget
    setDownloadTarget(null)
    if (!file) return
    const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(file.path, 60, { download: file.name })
    if (error || !data?.signedUrl) {
      toast.error('Anhang konnte nicht geladen werden' + (error ? ': ' + error.message : ''))
      return
    }
    window.location.href = data.signedUrl
  }

  const toolbar = (
    <>
      <SearchInput
        placeholder="Absender, E-Mail, Firma, Herkunft oder Text suchen"
        aria-label="Anfragen durchsuchen"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Select aria-label="Formular" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-auto sm:min-w-[200px]">
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

  return (
    <>
      <TableCard toolbar={toolbar}>
        {filteredSubmissions.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} aria-hidden="true" />}
            title={submissions.length === 0 ? 'Keine Formulareingänge vorhanden.' : 'Keine passenden Anfragen gefunden.'}
            description={submissions.length === 0 ? undefined : 'Suche oder Filter anpassen.'}
          />
        ) : (
          <SubmissionsList
            submissions={filteredSubmissions}
            activeId={activeSubmission?.id ?? null}
            hasAttachment={(id) => filesOf(id).some((f) => f.status === 'ok')}
            onOpen={openSubmission}
            onStatusChange={updateStatus}
            onDelete={openDelete}
          />
        )}
      </TableCard>

      {hasMore && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#64748B]">
          <span>
            {submissions.length} von {total} Anfragen geladen. Suche und Filter gelten für die geladenen.
          </span>
          <Button size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Lädt …' : 'Ältere laden'}
          </Button>
        </div>
      )}

      {activeSubmission && (
        <SubmissionDetail
          submission={activeSubmission}
          files={filesOf(activeSubmission.id)}
          open={panelOpen}
          onClose={closePanel}
          onDelete={openDelete}
          onStatusChange={updateStatus}
          onDownload={setDownloadTarget}
        />
      )}

      <ConfirmDialog open={deleteTarget !== null} title="Anfrage löschen?" pending={isPending} onConfirm={confirmDelete} onCancel={cancelDelete}>
        Eintrag von „{deleteTarget?.name}“ wirklich löschen? Anhänge werden mit gelöscht.
      </ConfirmDialog>

      <ConfirmDialog
        open={downloadTarget !== null}
        title="Anhang herunterladen?"
        confirmLabel="Herunterladen"
        danger={false}
        onConfirm={confirmDownload}
        onCancel={() => setDownloadTarget(null)}
      >
        <Note tone="warn">
          Dieser Anhang wurde von einer fremden Person über ein Formular der Website geschickt und ist nicht auf Viren
          geprüft. Öffne ihn nur, wenn du ihn erwartest, und lass ihn vorher vom Virenschutz deines Rechners
          prüfen. Für alles, was beim Öffnen auf deinem Rechner passiert, bist du selbst verantwortlich.
        </Note>
      </ConfirmDialog>
    </>
  )
}
