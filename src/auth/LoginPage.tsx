// Quelle: template/src/app/admin/login/page.tsx
// Generische Login-Seite ohne Branding. Kundenprojekte mit eigenem Branding
// (z.B. richardprinz: Logo, individuelle Optik) behalten ihre eigene Seite und
// nutzen stattdessen nur `login` aus core-cms/auth als Server Action.

import { login } from './login-actions'

export interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/10 p-8 sm:p-10">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black tracking-tight mb-2">
            Admin Anmelden
          </h1>
          <p className="text-sm text-neutral-500">
            Bitte melden Sie sich an, um Inhalte zu verwalten.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-black">
              E-Mail Adresse
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black outline-none text-sm"
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-black">
              Passwort
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black outline-none text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 mt-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs">
          <a href="/admin/forgot-password" className="text-black font-semibold hover:underline">
            Passwort vergessen?
          </a>
          <a href="/" className="text-neutral-500 hover:text-black transition-colors pt-2">
            &larr; Zurück zur Website
          </a>
        </div>

      </div>
    </div>
  )
}
