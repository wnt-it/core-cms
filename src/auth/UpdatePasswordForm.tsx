'use client'

import { useState } from 'react'
import { updatePassword } from './login-actions'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function UpdatePasswordForm() {
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
    <>
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-bold uppercase tracking-wider text-black">
            Neues Passwort (min. 6 Zeichen)
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="font-display w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Passwort speichern"}
        </button>
      </form>
    </>
  )
}
