'use client'

// Konto-Verwaltung für angemeldete Nutzer: eigene E-Mail-Adresse und eigenes
// Passwort ändern. Nutzt dieselben Server Actions (updateOwnEmail/updateOwnPassword),
// die auch für den "Passwort vergessen"-Callback zuständig sind (siehe login-actions.ts),
// verlangt hier aber zusätzlich das aktuelle Passwort zur Bestätigung.

import { useState } from 'react'
import { updateOwnEmail, updateOwnPassword } from './login-actions'
import { Mail, KeyRound, Save, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface AccountFormProps {
  currentEmail: string
}

export default function AccountForm({ currentEmail }: AccountFormProps) {
  return (
    <div className="space-y-6 max-w-2xl">
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
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <h2 className="font-extrabold text-xl text-black flex items-center gap-2">
            <Mail className="text-primary" size={22} />
            <span>E-Mail-Adresse</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Aktuell angemeldet als <span className="font-semibold text-black">{currentEmail}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-700">Neue E-Mail-Adresse</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@adresse.de"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-700">Aktuelles Passwort zur Bestätigung</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>

        <p className="text-neutral-400">
          Aus Sicherheitsgründen wird zuerst ein Bestätigungslink an die neue Adresse geschickt — die
          Änderung wird erst nach dem Klick auf diesen Link wirksam.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Bestätigungslink senden</span>
          </button>
        </div>
      </form>
    </div>
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
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="border-b border-black/5 pb-4">
        <h2 className="font-extrabold text-xl text-black flex items-center gap-2">
          <KeyRound className="text-primary" size={22} />
          <span>Passwort ändern</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Passwort vergessen? Melden Sie sich ab und nutzen Sie stattdessen den Link
          "Passwort vergessen?" auf der Login-Seite.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-700">Aktuelles Passwort</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors p-1 cursor-pointer"
                aria-label={showCurrent ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-700">Neues Passwort (min. 6 Zeichen)</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors p-1 cursor-pointer"
                aria-label={showNew ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Passwort speichern</span>
          </button>
        </div>
      </form>
    </div>
  )
}
