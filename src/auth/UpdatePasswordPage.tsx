// Quelle: template/src/app/admin/update-password/page.tsx
// Server-Wrapper: holt Branding über AuthCardShell, delegiert Interaktion an
// UpdatePasswordForm (Client Component).

import Link from 'next/link'
import AuthCardShell from './AuthCardShell'
import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <AuthCardShell
      title="Neues Passwort festlegen"
      subtitle="Bitte vergeben Sie ein neues Passwort für Ihren Zugang."
      footer={
        <Link href="/admin/login" className="text-xs text-neutral-500 hover:text-black transition-colors">
          &larr; Zurück zum Login
        </Link>
      }
    >
      <UpdatePasswordForm />
    </AuthCardShell>
  )
}
