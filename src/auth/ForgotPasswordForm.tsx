'use client'

import { useState } from 'react'
import { requestPasswordReset } from './login-actions'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await requestPasswordReset(formData)
      if (res.success) {
        setSuccess(true)
      } else {
        setErrorMsg(res.error || "Ein unbekannter Fehler ist aufgetreten.")
      }
    } catch (err) {
      setErrorMsg("Es gab ein Problem bei der Anfrage.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold text-center">
        E-Mail wurde gesendet. Bitte prüfen Sie Ihren Posteingang.
      </div>
    )
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-bold uppercase tracking-wider text-black">
            E-Mail Adresse
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm"
            placeholder="ihre@email.de"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="font-display w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Link anfordern"}
        </button>
      </form>
    </>
  )
}
