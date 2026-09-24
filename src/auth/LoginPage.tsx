// Quelle: template/src/app/admin/login/page.tsx
// Zentrale Login-Seite mit automatischem Branding (Logo/Site-Name aus site_settings,
// Farben/Schrift über die Tailwind-Tokens des jeweiligen Kundenprojekts) - siehe
// AuthCardShell. Kundenprojekte binden diese Seite direkt ein statt eine eigene zu pflegen.

import AuthCardShell from './AuthCardShell'
import { login } from './login-actions'

export interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <AuthCardShell
      title="Admin Anmelden"
      subtitle="Bitte melden Sie sich an, um Inhalte zu verwalten."
      footer={
        <div className="flex flex-col items-center gap-2">
          <a href="/admin/forgot-password" className="text-primary text-sm font-semibold hover:underline">
            Passwort vergessen?
          </a>
          <a href="/" className="text-neutral-500 text-xs hover:text-black transition-colors pt-2">
            &larr; Zurück zur Website
          </a>
        </div>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-bold uppercase tracking-wider text-black">
            E-Mail Adresse
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm"
            placeholder="admin@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-bold uppercase tracking-wider text-black">
            Passwort
          </label>
          <input
            type="password"
            name="password"
            required
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="font-display w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm cursor-pointer"
        >
          Anmelden
        </button>
      </form>
    </AuthCardShell>
  )
}
