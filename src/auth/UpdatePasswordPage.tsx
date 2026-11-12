// Server-Wrapper: holt Branding über AuthCardShell, delegiert Interaktion an
// UpdatePasswordForm (Client Component).

import Link from 'next/link'
import AuthCardShell from './AuthCardShell'
import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <AuthCardShell
      title="Neues Passwort festlegen"
      subtitle="Bitte vergib ein neues Passwort für deinen Zugang."
      footer={
        <Link href="/admin/login" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
          &larr; Zurück zum Login
        </Link>
      }
    >
      <UpdatePasswordForm />
    </AuthCardShell>
  )
}
