'use client'

// Konto-Verwaltung für angemeldete Nutzer: eigene E-Mail-Adresse und eigenes
// Passwort ändern. Nutzt dieselben Server Actions (updateOwnEmail/updateOwnPassword),
// die auch für den "Passwort vergessen"-Callback zuständig sind (siehe login-actions.ts),
// verlangt hier aber zusätzlich das aktuelle Passwort zur Bestätigung.
// Zwei unabhängige Formulare, daher je Abschnitt eine Karte mit eigener Fußzeile statt SaveBar.

import { useId, useState } from 'react'
import { updateOwnEmail, updateOwnPassword } from './login-actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PASSWORD_RULES_HINT } from './auth-errors'
import { Button, CardFooter, Field, FieldGrid, Input, Section } from '../ui/components'
import { cardClass, cx, hintClass, iconButtonClass, labelClass } from '../ui/styles'

export interface AccountFormProps {
  currentEmail: string
}

export default function AccountForm({ currentEmail }: AccountFormProps) {
  return (
    <div>
      <EmailSection currentEmail={currentEmail} />
      <PasswordSection />
    </div>
  )
}

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const form = new FormData()
      form.append('email', newEmail)
      form.append('currentPassword', currentPassword)
      const result = await updateOwnEmail(form)
      if (result.success) {
        toast.success(result.message || 'Bestätigungslink gesendet.')
        setNewEmail('')
        setCurrentPassword('')
      } else {
        toast.error(result.error || 'Fehler beim Ändern der E-Mail-Adresse.')
      }
    } catch (err: any) {
      toast.error('Verbindungsfehler: ' + (err?.message || ''))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Section
      bare
      title="E-Mail-Adresse"
      description="Mit dieser Adresse melden Sie sich an. Aus Sicherheitsgründen wird zuerst ein Bestätigungslink an die neue Adresse geschickt."
    >
      <form onSubmit={handleSubmit} className={cx(cardClass, 'min-w-0')}>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-[#FAFAFC] px-3.5 py-3">
            <span className="text-[13px] text-[#64748B]">Aktuell angemeldet als</span>
            <span className="min-w-0 break-all text-[14px] font-medium text-[#0F172A]">{currentEmail}</span>
          </div>
          <FieldGrid>
            <Field label="Neue E-Mail-Adresse">
              <Input
                type="email"
                required
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue@adresse.de"
              />
            </Field>
            <Field label="Aktuelles Passwort zur Bestätigung">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </FieldGrid>
        </div>
        <CardFooter>
          <p className={cx(hintClass, 'mr-auto')}>Die Änderung wird erst nach dem Klick auf den Link wirksam.</p>
          <Button type="submit" variant="secondary" disabled={isSaving}>
            {isSaving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Bestätigungslink senden
          </Button>
        </CardFooter>
      </form>
    </Section>
  )
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const form = new FormData()
      form.append('currentPassword', currentPassword)
      form.append('password', newPassword)
      const result = await updateOwnPassword(form)
      if (result.success) {
        toast.success('Passwort erfolgreich geändert.')
        setCurrentPassword('')
        setNewPassword('')
      } else {
        toast.error(result.error || 'Fehler beim Ändern des Passworts.')
      }
    } catch (err: any) {
      toast.error('Verbindungsfehler: ' + (err?.message || ''))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Section
      bare
      title="Passwort"
      description={<>Passwort vergessen? Melden Sie sich ab und nutzen Sie stattdessen den Link „Passwort vergessen?“ auf der Login-Seite.</>}
    >
      <form onSubmit={handleSubmit} className={cx(cardClass, 'min-w-0')}>
        <div className="p-5 sm:p-6">
          <FieldGrid>
            <PasswordField
              label="Aktuelles Passwort"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
              autoComplete="current-password"
            />
            <PasswordField
              label="Neues Passwort"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggle={() => setShowNew(!showNew)}
              autoComplete="new-password"
              minLength={10}
              hint={PASSWORD_RULES_HINT}
            />
          </FieldGrid>
        </div>
        <CardFooter>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Passwort speichern
          </Button>
        </CardFooter>
      </form>
    </Section>
  )
}

/** Passwortfeld mit Auge zum Ein-/Ausblenden. Kein <label> drumherum, weil der Knopf darin liegt. */
function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  minLength,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  autoComplete: string
  minLength?: number
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <span className="relative flex">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          className={cx(iconButtonClass, 'absolute right-0.5 top-0.5 h-9 w-9')}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {hint && <span id={`${id}-hint`} className={hintClass}>{hint}</span>}
    </div>
  )
}
