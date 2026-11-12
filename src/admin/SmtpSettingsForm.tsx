'use client'

// SMTP-Einstellungen im Admin. Das gespeicherte Passwort kommt nie in den Browser: Das Feld bleibt leer,
// leer gespeichert bleibt das alte Passwort erhalten. Angezeigt wird nur, ob eines gespeichert ist.

import { useState, useEffect } from 'react'
import { saveSmtpSettings, getSmtpSettings, sendTestEmail } from './settings-actions'
import { Send, Save, Eye, EyeOff, Loader2, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { cx, hintClass, iconButtonClass, mutedClass } from '../ui/styles'
import { Button, Card, CardFooter, Field, FieldGrid, Input, Note, SaveBar, Section } from '../ui/components'
import type { SmtpFormValues } from '../email/smtp-settings'
import { listFormTypes, type FormRecipientsInfo } from '../email/form-recipients'

interface SmtpSettingsFormProps {
  initialSettings?: Partial<SmtpFormValues> & { missing?: string[]; forms?: FormRecipientsInfo }
  /** Formulare, die das Projekt schon vor der ersten Anfrage anzeigen will (Optionen der Einstellungsseite) */
  declaredForms?: string[]
}

const NO_FORMS: FormRecipientsInfo = { types: [], recipients: {}, available: true }

const toForm = (s?: Partial<SmtpFormValues>) => ({
  host: s?.host || '',
  port: s?.port || '587',
  user: s?.user || '',
  pass: '',
  fromName: s?.fromName || '',
  fromEmail: s?.fromEmail || '',
  recipient: s?.recipient || '',
})

export default function SmtpSettingsForm({ initialSettings, declaredForms = [] }: SmtpSettingsFormProps) {
  const [formData, setFormData] = useState(() => toForm(initialSettings))
  const [forms, setForms] = useState<FormRecipientsInfo>(initialSettings?.forms ?? NO_FORMS)
  const [formRecipients, setFormRecipients] = useState<Record<string, string>>(() => ({ ...(initialSettings?.forms?.recipients ?? {}) }))
  const [testingForm, setTestingForm] = useState<string | null>(null)
  const formTypes = listFormTypes(declaredForms, forms.types)
  const [passStatus, setPassStatus] = useState<SmtpFormValues['passStatus']>(initialSettings?.passStatus ?? 'none')
  const [missing, setMissing] = useState<string[]>(initialSettings?.missing ?? [])
  const [showPass, setShowPass] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialSettings)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!initialSettings) {
      getSmtpSettings().then((settings) => {
        setFormData(toForm(settings))
        setPassStatus(settings.passStatus)
        setMissing(settings.missing)
        setForms(settings.forms)
        setFormRecipients({ ...settings.forms.recipients })
        setIsLoading(false)
      })
    }
  }, [initialSettings])

  // formType: Test an den Empfänger dieses Formulars (gespeicherter Stand)
  const handleTest = async (formType?: string) => {
    if (formType) setTestingForm(formType)
    else setIsTesting(true)
    try {
      const result = await sendTestEmail(formType)
      if (result.success) {
        toast.success(`Test-E-Mail gesendet an ${result.to}.`)
      } else {
        toast.error(result.error || 'Test-E-Mail fehlgeschlagen.')
      }
    } catch (err) {
      toast.error('Verbindungsfehler: ' + ((err as Error).message || ''))
    } finally {
      setIsTesting(false)
      setTestingForm(null)
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
    if (forms.available) form.append('form_recipients', JSON.stringify(formRecipients))

    try {
      const result = await saveSmtpSettings(form)
      if (result.success) {
        toast.success('SMTP-Einstellungen erfolgreich gespeichert!')
        // Neuer Stand vom Server (Passwort-Status, was noch fehlt); das eingegebene Passwort leeren
        const fresh = await getSmtpSettings()
        setFormData(toForm(fresh))
        setPassStatus(fresh.passStatus)
        setMissing(fresh.missing)
        setForms(fresh.forms)
        setFormRecipients({ ...fresh.forms.recipients })
      } else {
        toast.error(result.error || 'Fehler beim Speichern.')
      }
    } catch (err) {
      toast.error('Verbindungsfehler beim Speichern: ' + ((err as Error).message || ''))
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
      {missing.length > 0 && (
        <div className="mb-6"><Note tone="warn">
          Es geht noch keine E-Mail raus, Anfragen landen nur im Posteingang. Es fehlt: {missing.join(', ')}.
        </Note></div>
      )}
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
              placeholder="z.B. noreply@example.com"
              value={formData.fromEmail}
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
            />
          </Field>
          <Field label="Empfänger für Anfragen" className="sm:col-span-2">
            <Input
              type="email"
              placeholder="z.B. info@example.com"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            />
          </Field>
        </FieldGrid>
      </Section>

      {/* EMPFÄNGER JE FORMULAR (ab v0.17.0) - jedes Formular erscheint automatisch, leer = Empfänger für Anfragen */}
      <Section
        title="Empfänger je Formular"
        description="Jedes Formular der Website erscheint hier von selbst, spätestens mit seiner ersten Anfrage. Leer gelassen gehen Anfragen an den Empfänger für Anfragen. Mehrere Adressen mit Komma trennen."
      >
        {!forms.available ? (
          <Note tone="warn">
            Dafür fehlt noch die Datenbank-Aktualisierung für core-cms v0.17.0. Bis dahin gehen alle Anfragen an den Empfänger für Anfragen.
          </Note>
        ) : formTypes.length === 0 ? (
          <p className={hintClass}>Noch keine Formulare bekannt. Sobald eine Anfrage eingeht, erscheint ihr Formular hier.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {formTypes.map((type) => {
              const saved = (forms.recipients[type] ?? '') === (formRecipients[type] ?? '')
              return (
                <div key={type} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label={type}>
                    <Input
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="z.B. kontakt@example.com"
                      value={formRecipients[type] ?? ''}
                      onChange={(e) => setFormRecipients({ ...formRecipients, [type]: e.target.value })}
                    />
                  </Field>
                  <Button
                    size="sm"
                    onClick={() => handleTest(type)}
                    disabled={!saved || testingForm !== null || isSaving}
                    title={saved ? `Test-E-Mail an den Empfänger von „${type}“` : 'Erst speichern, dann testen'}
                  >
                    {testingForm === type ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Test</span>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
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
              Zugangsdaten des E-Mail-Postfachs, über das die Website E-Mails verschickt. Ohne sie werden
              Anfragen nur im Posteingang gespeichert.
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
                    placeholder="z.B. resend, apikey oder info@example.com"
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  />
                </Field>
                {/* div statt label: enthält auch den Anzeigen-Knopf */}
                <Field
                  as="div"
                  label={<label htmlFor="smtp-pass">Passwort / API-Key</label>}
                  hint={
                    passStatus === 'saved'
                      ? 'Gespeichert. Leer lassen, um es zu behalten.'
                      : passStatus === 'unreadable'
                        ? 'Das gespeicherte Passwort lässt sich nicht mehr lesen. Bitte neu eingeben.'
                        : 'Wird verschlüsselt gespeichert.'
                  }
                >
                  <span className="relative block">
                    <Input
                      id="smtp-pass"
                      type={showPass ? 'text' : 'password'}
                      required={passStatus !== 'saved'}
                      autoComplete="new-password"
                      placeholder={passStatus === 'saved' ? '•••••••• (gespeichert)' : 'Passwort eingeben'}
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
            <Button size="sm" onClick={() => handleTest()} disabled={isTesting || isSaving}>
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
