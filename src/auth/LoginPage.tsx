// Quelle: template/src/app/admin/login/page.tsx
// Zentrale Login-Seite mit automatischem Branding (Logo/Site-Name aus site_settings) -
// siehe AuthCardShell. Kundenprojekte binden diese Seite direkt ein statt eine eigene zu pflegen.

import AuthCardShell from './AuthCardShell'
import { login } from './login-actions'
import { Button, Input, Note } from '../ui/components'
import { labelClass } from '../ui/styles'

export interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <AuthCardShell
      title="Anmelden"
      subtitle="Bitte melden Sie sich an, um Inhalte zu verwalten."
      footer={
        <a href="/" className="text-[#64748B] transition-colors hover:text-[#0F172A]">
          &larr; Zurück zur Website
        </a>
      }
    >
      {error && <Note tone="error">{error}</Note>}

      <form action={login} className="flex flex-col gap-[18px]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>E-Mail-Adresse</span>
          <Input
            type="email"
            name="email"
            required
            autoComplete="username"
            placeholder="name@firma.de"
            aria-invalid={error ? true : undefined}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          {/* Label und „Vergessen?“-Link in einer Zeile */}
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className={labelClass}>Passwort</label>
            <a href="/admin/forgot-password" className="text-[13px] text-[#64748B] transition-colors hover:text-[#0F172A]">
              Passwort vergessen?
            </a>
          </div>
          <Input
            id="login-password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={error ? true : undefined}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full">
          Anmelden
        </Button>
      </form>
    </AuthCardShell>
  )
}
