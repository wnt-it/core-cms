'use client'

import { useState } from 'react'
import { requestPasswordReset } from './login-actions'
import { Loader2 } from 'lucide-react'
import { Button, Input, Note } from '../ui/components'
import { labelClass } from '../ui/styles'

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
      <div role="status" className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13.5px] text-[#166534]">
        E-Mail wurde gesendet. Bitte prüfen Sie Ihren Posteingang.
      </div>
    )
  }

  return (
    <>
      {errorMsg && <Note tone="error">{errorMsg}</Note>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>E-Mail-Adresse</span>
          <Input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="name@firma.de"
            aria-invalid={errorMsg ? true : undefined}
          />
        </label>

        <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 size={16} className="animate-spin" aria-label="Wird gesendet" /> : "Link anfordern"}
        </Button>
      </form>
    </>
  )
}
