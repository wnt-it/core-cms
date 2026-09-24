// Quelle: template/src/app/admin/forgot-password/page.tsx
// Server-Wrapper: holt Branding über AuthCardShell, delegiert Interaktion an
// ForgotPasswordForm (Client Component).

import Link from 'next/link'
import AuthCardShell from './AuthCardShell'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <AuthCardShell
      title="Passwort vergessen"
      subtitle="Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen."
      footer={
        <Link href="/admin/login" className="text-xs text-neutral-500 hover:text-black transition-colors">
          &larr; Zurück zum Login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCardShell>
  )
}
