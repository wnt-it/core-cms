'use client'

// Quelle: template/src/app/admin/update-password/page.tsx
// Import von updatePassword auf core-cms-internen relativen Pfad umgestellt.

import { useState } from 'react'
import Link from 'next/link'
import { updatePassword } from './login-actions'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")

    const formData = new FormData(e.currentTarget)
    try {
      const res = await updatePassword(formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else if (res?.success) {
        router.push('/admin')
      }
    } catch (err) {
      setErrorMsg("Ein Fehler ist aufgetreten.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/10 p-8 sm:p-10">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black tracking-tight mb-2">
            Neues Passwort festlegen
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Bitte vergeben Sie ein neues Passwort für Ihren Zugang.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-black">
              Neues Passwort (min. 6 Zeichen)
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black outline-none text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors shadow-sm flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Passwort speichern"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/admin/login" className="text-xs text-neutral-500 hover:text-black transition-colors">
            &larr; Zurück zum Login
          </Link>
        </div>

      </div>
    </div>
  )
}
