// Quelle: template/src/app/admin/(dashboard)/submissions/page.tsx
// Als wiederverwendbare Server-Component statt Next.js-Routendatei, damit sie aus
// core-cms importiert werden kann. Der Titel ist optional/generisch, statt
// hartcodiert "richardprinz Admin".

import { createClient } from '../supabase/server'
import SubmissionsAdminClient from './SubmissionsAdminClient'
import { Submission } from '../supabase/types'

export interface AdminSubmissionsPageProps {
  heading?: string
  description?: string
}

export default async function AdminSubmissionsPage({
  heading = 'posteingang & anfragen',
  description = 'alle anfragen über das kontaktformular und weitere formulare an einem ort.',
}: AdminSubmissionsPageProps = {}) {
  const supabase = await createClient()

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight lowercase font-display">
            {heading}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 lowercase">
            {description}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-200">
          Fehler beim Laden der Nachrichten: {error.message}
        </div>
      )}

      <SubmissionsAdminClient initialSubmissions={(submissions as Submission[]) || []} />
    </div>
  )
}
