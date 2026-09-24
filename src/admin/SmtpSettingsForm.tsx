'use client'

// Quelle: template/src/components/admin/SmtpSettingsForm.tsx
// Import der Server Actions auf core-cms-internen relativen Pfad umgestellt.

import { useState, useEffect } from 'react'
import { saveSmtpSettings, getSmtpSettings } from './settings-actions'
import { Mail, Save, Eye, EyeOff, Loader2, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

interface SmtpSettingsFormProps {
  initialSettings?: {
    host?: string
    port?: string
    user?: string
    pass?: string
    fromName?: string
    fromEmail?: string
    recipient?: string
  }
}

export default function SmtpSettingsForm({ initialSettings }: SmtpSettingsFormProps) {
  const [formData, setFormData] = useState({
    host: initialSettings?.host || '',
    port: initialSettings?.port || '587',
    user: initialSettings?.user || '',
    pass: initialSettings?.pass || '',
    fromName: initialSettings?.fromName || '',
    fromEmail: initialSettings?.fromEmail || '',
    recipient: initialSettings?.recipient || ''
  })
  const [showPass, setShowPass] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialSettings)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!initialSettings) {
      getSmtpSettings().then((settings) => {
        setFormData({
          host: settings.host || '',
          port: settings.port || '587',
          user: settings.user || '',
          pass: settings.pass || '',
          fromName: (settings as any).fromName || '',
          fromEmail: (settings as any).fromEmail || '',
          recipient: (settings as any).recipient || ''
        })
        setIsLoading(false)
      })
    }
  }, [initialSettings])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)

    const form = new FormData()
    form.append('smtp_host', formData.host)
    form.append('smtp_port', formData.port)
    form.append('smtp_user', formData.user)
    form.append('smtp_pass', formData.pass)
    form.append('smtp_from_name', formData.fromName)
    form.append('smtp_from_email', formData.fromEmail)
    form.append('smtp_recipient', formData.recipient)

    try {
      const result = await saveSmtpSettings(form)
      if (result.success) {
        toast.success('SMTP-Einstellungen erfolgreich gespeichert!')
      } else {
        toast.error(result.error || 'Fehler beim Speichern.')
      }
    } catch (err: any) {
      toast.error('Verbindungsfehler beim Speichern: ' + (err.message || ''))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-8 flex items-center justify-center text-neutral-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-xs font-semibold">SMTP-Einstellungen werden geladen...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <h2 className="font-extrabold text-xl text-black flex items-center gap-2">
            <Mail className="text-primary" size={22} />
            <span>E-Mail Server (SMTP)</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Zentrale Serverdaten für den Versand von Kontaktanfragen und System-Benachrichtigungen.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">

        {/* ABSENDER & EMPFÄNGER - für alle Nutzer sichtbar, keine technische Erklärung nötig */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-black border-b border-black/5 pb-2">
            Absender &amp; Empfänger
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Absender Name</label>
              <input
                type="text"
                placeholder="z.B. Website Formular"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Absender E-Mail</label>
              <input
                type="email"
                placeholder="z.B. noreply@domain.de"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Empfänger für Anfragen</label>
              <input
                type="email"
                placeholder="z.B. info@domain.de"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
              />
            </div>
          </div>
        </div>

        {/* SERVER-DATEN + ZUGANGSDATEN - technische Details, standardmäßig eingeklappt */}
        <div className="pt-2 border-t border-black/5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-3 cursor-pointer group"
            aria-expanded={showAdvanced}
          >
            <span className="flex items-center gap-2 font-bold text-neutral-700 group-hover:text-black transition-colors">
              <Settings2 size={15} />
              Server-Einstellungen (für Techniker)
            </span>
            <ChevronDown
              size={16}
              className={`text-neutral-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {!showAdvanced && (
            <p className="text-neutral-400 pb-1">
              Normalerweise nicht nötig — nur öffnen, wenn du einen eigenen E-Mail-Server statt der
              Standard-Konfiguration nutzen möchtest.
            </p>
          )}

          {showAdvanced && (
            <div className="space-y-6 pt-2 pb-1">
              <div className="space-y-4">
                <h4 className="font-bold text-neutral-500">Postausgangsserver (SMTP)</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-neutral-700">SMTP Host / Server-Adresse *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. smtp.resend.com oder smtp.ionos.de"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700">Port *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. 465 oder 587"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-neutral-500">Zugangsdaten</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700">Benutzername *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. resend, apikey oder info@domain.de"
                      value={formData.user}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700">Passwort / API-Key *</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={formData.pass}
                        onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-medium pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors p-1 cursor-pointer"
                        aria-label={showPass ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="pt-4 border-t border-black/5 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>SMTP-Einstellungen speichern</span>
          </button>
        </div>

      </form>
    </div>
  )
}
