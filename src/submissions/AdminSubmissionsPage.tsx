// Quelle: template/src/app/admin/(dashboard)/submissions/page.tsx
// Als wiederverwendbare Server-Component statt Next.js-Routendatei, damit sie aus
// core-cms importiert werden kann. Der Titel ist optional/generisch, statt
// eines hartcodierten Namens.

import { createClient } from '../supabase/server'
import SubmissionsAdminClient from './SubmissionsAdminClient'
import { Submission } from '../supabase/types'
import { Note, PageHeader } from '../ui'

export interface AdminSubmissionsPageProps {
  heading?: string
  description?: string
}

export default async function AdminSubmissionsPage({
  heading = 'Posteingang',
  description = 'Alle Anfragen über das Kontaktformular und weitere Formulare an einem Ort.',
}: AdminSubmissionsPageProps = {}) {
  const supabase = await createClient()

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={heading} description={description} />

      {error && <Note tone="error">Fehler beim Laden der Nachrichten: {error.message}</Note>}

      <SubmissionsAdminClient initialSubmissions={(submissions as Submission[]) || []} />
    </>
  )
}
