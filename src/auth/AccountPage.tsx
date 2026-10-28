// Server-Wrapper für /admin/konto: holt die aktuelle E-Mail-Adresse serverseitig
// und übergibt sie an AccountForm (Client Component).

import { createClient } from '../supabase/server'
import AccountForm from './AccountForm'
import { PageHeader } from '../ui/components'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <PageHeader title="Mein Konto" description="E-Mail-Adresse und Passwort Ihres Admin-Zugangs verwalten." />
      <AccountForm currentEmail={user?.email || ''} />
    </>
  )
}
