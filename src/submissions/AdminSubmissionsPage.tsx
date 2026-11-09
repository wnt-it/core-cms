// Admin-Seite „Posteingang“ (ab v0.15.0 Core-Seite /admin/posteingang über coreAdminPages).
// Lädt Anfragen und Anhänge mit dem Zugang des angemeldeten Admins. Besucher können nichts lesen (RLS).

import { createClient } from '../supabase/server'
import SubmissionsAdminClient from './SubmissionsAdminClient'
import type { Submission, SubmissionFile } from '../supabase/types'
import { Note, PageHeader } from '../ui'

export interface AdminSubmissionsPageProps {
  heading?: string
  description?: string
}

export default async function AdminSubmissionsPage({
  heading = 'Posteingang',
  description = 'Alle Anfragen aus den Formularen der Website an einem Ort.',
}: AdminSubmissionsPageProps = {}) {
  const supabase = await createClient()

  const [{ data: submissions, error }, files] = await Promise.all([
    supabase.from('submissions').select('*').order('created_at', { ascending: false }),
    // Tabelle gibt es erst ab sql/0.15.0_posteingang.sql, ohne sie einfach keine Anhänge zeigen
    supabase.from('submission_files').select('*').order('created_at'),
  ])

  return (
    <>
      <PageHeader title={heading} description={description} />

      {error && <Note tone="error">Fehler beim Laden der Nachrichten: {error.message}</Note>}

      <SubmissionsAdminClient
        initialSubmissions={(submissions as Submission[]) || []}
        initialFiles={files.error ? [] : ((files.data as SubmissionFile[]) ?? [])}
      />
    </>
  )
}
