// Admin-Seite „Posteingang“ (ab v0.15.0 Core-Seite /admin/posteingang über coreAdminPages).
// Lädt Anfragen und Anhänge mit dem Zugang des angemeldeten Admins. Besucher können nichts lesen (RLS).
// Ab v0.16.0 seitenweise: zuerst die neuesten SUBMISSIONS_PAGE Anfragen, ältere lädt der Admin nach.
// Vorher kamen alle auf einmal, ab 1000 Anhängen fehlten die neuesten (Grenze der Schnittstelle).

import { createClient } from '../supabase/server'
import { createServiceRoleClient } from '../supabase/service-role'
import SubmissionsAdminClient from './SubmissionsAdminClient'
import { cleanupPendingAttachments } from './cleanup'
import { SUBMISSIONS_PAGE } from './paging'
import type { Submission, SubmissionFile } from '../supabase/types'
import { Note, PageHeader } from '../ui/components'

export interface AdminSubmissionsPageProps {
  heading?: string
  description?: string
}

export default async function AdminSubmissionsPage({
  heading = 'Posteingang',
  description = 'Alle Anfragen aus den Formularen der Website an einem Ort.',
}: AdminSubmissionsPageProps = {}) {
  const supabase = await createClient()

  // Nie fertig hochgeladene Anhänge entfernen, bevor sie angezeigt werden
  const service = createServiceRoleClient()
  if (service) await cleanupPendingAttachments(service)

  const { data: submissions, error, count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, SUBMISSIONS_PAGE - 1)

  const ids = (submissions ?? []).map((s) => s.id as string)
  // Tabelle gibt es erst ab sql/0.15.0_posteingang.sql, ohne sie einfach keine Anhänge zeigen
  const files = ids.length
    ? await supabase.from('submission_files').select('*').in('submission_id', ids).order('created_at')
    : { data: [], error: null }

  return (
    <>
      <PageHeader title={heading} description={description} />

      {error && <Note tone="error">Fehler beim Laden der Nachrichten: {error.message}</Note>}

      <SubmissionsAdminClient
        initialSubmissions={(submissions as Submission[]) || []}
        initialFiles={files.error ? [] : ((files.data as SubmissionFile[]) ?? [])}
        totalCount={count ?? undefined}
      />
    </>
  )
}
