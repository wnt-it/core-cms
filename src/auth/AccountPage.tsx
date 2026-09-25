// Server-Wrapper für /admin/konto: holt die aktuelle E-Mail-Adresse serverseitig
// und übergibt sie an AccountForm (Client Component).

import { createClient } from '../supabase/server'
import AccountForm from './AccountForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
          Mein Konto
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          E-Mail-Adresse und Passwort Ihres Admin-Zugangs verwalten.
        </p>
      </div>
      <AccountForm currentEmail={user?.email || ''} />
    </div>
  )
}
