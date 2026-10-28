'use client'

// Quelle: template/src/components/admin/SmtpSettingsForm.tsx
// Import der Server Actions auf core-cms-internen relativen Pfad umgestellt.

import { useState, useEffect } from 'react'
import { saveSmtpSettings, getSmtpSettings, sendTestEmail } from './settings-actions'
import { Send, Save, Eye, EyeOff, Loader2, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, CardFooter, Field, FieldGrid, Input, SaveBar, Section, cx, hintClass, iconButtonClass, mutedClass } from '../ui'

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
  const [isTesting, setIsTesting] = useState(false)
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

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await sendTestEmail()
      if (result.success) {
        toast.success(`Test-E-Mail gesendet an ${result.to}.`)
      } else {
        toast.error(result.error || 'Test-E-Mail fehlgeschlagen.')
      }
    } catch (err: any) {
      toast.error('Verbindungsfehler: ' + (err.message || ''))
    } finally {
      setIsTesting(false)
    }
  }

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
      <Card>
        <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[#64748B]" role="status">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          <span>SMTP-Einstellungen werden geladen...</span>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* ABSENDER & EMPFÄNGER - für alle Nutzer sichtbar, keine technische Erklärung nötig */}
      <Section
        title="Absender & Empfänger"
        description="Von dieser Adresse gehen E-Mails an Besucher. Neue Anfragen landen beim Empfänger."
      >
        <FieldGrid>
          <Field label="Absender Name">
            <Input
              type="text"
              placeholder="z.B. Website Formular"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
            />
          </Field>
          <Field label="Absender E-Mail">
            <Input
              type="email"
              placeholder="z.B. noreply@domain.de"
              value={formData.fromEmail}
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
            />
          </Field>
          <Field label="Empfänger für Anfragen" className="sm:col-span-2">
            <Input
              type="email"
              placeholder="z.B. info@domain.de"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            />
          </Field>
        </FieldGrid>
      </Section>

      {/* SERVER-DATEN + ZUGANGSDATEN - technische Details, standardmäßig eingeklappt */}
      <Section
        title="Mailserver"
        description="Zentrale Serverdaten für den Versand von Kontaktanfragen und System-Benachrichtigungen."
        bare
      >
        <Card padded={false}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-t-xl px-5 py-4 text-left outline-none transition-colors hover:bg-[#FAFAFC] focus-visible:shadow-[0_0_0_3px_var(--admin-ring)] sm:px-6"
            aria-expanded={showAdvanced}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Settings2 size={16} className="shrink-0 text-[#64748B]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-[#0F172A]">Server-Einstellungen (für Techniker)</span>
                {formData.host && (
                  <span className={cx(mutedClass, 'block truncate')}>
                    {formData.host}
                    {formData.port ? ` · Port ${formData.port}` : ''}
                  </span>
                )}
              </span>
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={cx('shrink-0 text-[#64748B] transition-transform duration-200', showAdvanced && 'rotate-180')}
            />
          </button>

          {!showAdvanced && (
            <p className={cx(hintClass, 'px-5 pb-5 sm:px-6')}>
              Normalerweise nicht nötig — nur öffnen, wenn du einen eigenen E-Mail-Server statt der
              Standard-Konfiguration nutzen möchtest.
            </p>
          )}

          {showAdvanced && (
            <div className="flex flex-col gap-5 px-5 pb-6 pt-1 sm:px-6">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                <Field label="SMTP Host / Server-Adresse">
                  <Input
                    type="text"
                    required
                    placeholder="z.B. smtp.resend.com oder smtp.ionos.de"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  />
                </Field>
                <Field label="Port">
                  <Input
                    type="text"
                    required
                    placeholder="z.B. 465 oder 587"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  />
                </Field>
              </div>

              <FieldGrid>
                <Field label="Benutzername">
                  <Input
                    type="text"
                    required
                    placeholder="z.B. resend, apikey oder info@domain.de"
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  />
                </Field>
                {/* div statt label: enthält auch den Anzeigen-Knopf */}
                <Field as="div" label={<label htmlFor="smtp-pass">Passwort / API-Key</label>} hint="Wird verschlüsselt gespeichert.">
                  <span className="relative block">
                    <Input
                      id="smtp-pass"
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={formData.pass}
                      onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className={cx(iconButtonClass, 'absolute right-0.5 top-0.5')}
                      aria-label={showPass ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </Field>
              </FieldGrid>
            </div>
          )}

          <CardFooter>
            <span className={hintClass}>Die Test-E-Mail geht an den Empfänger für Anfragen.</span>
            <Button size="sm" onClick={handleTest} disabled={isTesting || isSaving}>
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Test-E-Mail senden</span>
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <SaveBar start={<p className={hintClass}>Änderungen gelten sofort für alle Formulare.</p>}>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>SMTP-Einstellungen speichern</span>
        </Button>
      </SaveBar>
    </form>
  )
}
