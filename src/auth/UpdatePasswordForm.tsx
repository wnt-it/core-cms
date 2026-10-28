'use client'

import { useState } from 'react'
import { updatePassword } from './login-actions'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PASSWORD_RULES_HINT } from './auth-errors'
import { Button, Input, Note } from '../ui/components'
import { cx, labelClass } from '../ui/styles'

// Nur Anzeige beim Tippen (gleiche Regeln wie PASSWORD_RULES_HINT); geprüft wird auf dem Server.
const RULES: Array<{ label: string; test: (pw: string) => boolean }> = [
  { label: 'Mindestens 10 Zeichen', test: (pw) => pw.length >= 10 },
  { label: 'Groß- und Kleinbuchstaben', test: (pw) => /[a-zäöü]/.test(pw) && /[A-ZÄÖÜ]/.test(pw) },
  { label: 'Eine Ziffer', test: (pw) => /\d/.test(pw) },
  { label: 'Ein Sonderzeichen', test: (pw) => /[^A-Za-z0-9ÄÖÜäöüß\s]/.test(pw) },
]

export default function UpdatePasswordForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [password, setPassword] = useState("")

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
      {errorMsg && <Note tone="error">{errorMsg}</Note>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className={labelClass}>Neues Passwort</label>
          <Input
            id="new-password"
            type="password"
            name="password"
            required
            minLength={10}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-describedby="new-password-rules"
            aria-invalid={errorMsg ? true : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="new-password-rules" className="sr-only">{PASSWORD_RULES_HINT}</p>
          <ul aria-hidden="true" className="mt-1 grid grid-cols-1 gap-x-3 gap-y-1 text-[13px] min-[360px]:grid-cols-2">
            {RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li key={rule.label} className={cx('flex items-center gap-1.5', ok ? 'text-[#166534]' : 'text-[#64748B]')}>
                  <span className="w-3 text-center">{ok ? '✓' : '○'}</span>
                  {rule.label}
                </li>
              )
            })}
          </ul>
        </div>

        <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 size={16} className="animate-spin" aria-label="Wird gespeichert" /> : "Passwort speichern"}
        </Button>
      </form>
    </>
  )
}
