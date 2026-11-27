'use client'

// E-Mail-Einstellungen im Admin. Zwei Versandarten (ab v0.19.0): SMTP und Microsoft 365 (Graph).
// Das gespeicherte Passwort bzw. Client-Secret kommt nie in den Browser: Das Feld bleibt leer,
// leer gespeichert bleibt der alte Wert erhalten. Angezeigt wird nur, ob einer gespeichert ist.

import { useState, useEffect } from 'react'
import { saveSmtpSettings, getSmtpSettings, sendTestEmail } from './settings-actions'
import { Send, Save, Loader2, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { cx, hintClass, mutedClass } from '../ui/styles'
import { Button, Card, CardFooter, Field, FieldGrid, Input, Note, SaveBar, Section, Segmented, SwitchRow } from '../ui/components'
import { SmtpStatus } from './SmtpStatus'
import type { SmtpFormValues } from '../email/smtp-settings'
import { listFormTypes, type FormRecipientsInfo } from '../email/form-recipients'
import { secretExpiry, secretExpiryHint, SECRET_MAX_MONTHS } from '../email/graph-check-types'

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
  skipCertCheck: s?.skipCertCheck === true,
  transport: (s?.transport ?? 'smtp') as SmtpFormValues['transport'],
  msTenantId: s?.msTenantId || '',
  msClientId: s?.msClientId || '',
  msSecret: '',
  msSender: s?.msSender || '',
  msSecretExpiresAt: s?.msSecretExpiresAt || '',
})

export default function SmtpSettingsForm({ initialSettings, declaredForms = [] }: SmtpSettingsFormProps) {
  const [formData, setFormData] = useState(() => toForm(initialSettings))
  const [forms, setForms] = useState<FormRecipientsInfo>(initialSettings?.forms ?? NO_FORMS)
  const [formRecipients, setFormRecipients] = useState<Record<string, string>>(() => ({ ...(initialSettings?.forms?.recipients ?? {}) }))
  const [testingForm, setTestingForm] = useState<string | null>(null)
  const formTypes = listFormTypes(declaredForms, forms.types)
  const [passStatus, setPassStatus] = useState<SmtpFormValues['passStatus']>(initialSettings?.passStatus ?? 'none')
  const [missing, setMissing] = useState<string[]>(initialSettings?.missing ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialSettings)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [certSwitchAvailable, setCertSwitchAvailable] = useState(initialSettings?.certSwitchAvailable ?? true)
  const [msAvailable, setMsAvailable] = useState(initialSettings?.msAvailable ?? true)
  const [msSecretStatus, setMsSecretStatus] = useState<SmtpFormValues['msSecretStatus']>(initialSettings?.msSecretStatus ?? 'none')
  const isMs = formData.transport === 'microsoft365'
  const expiry = secretExpiry(formData.msSecretExpiresAt)
  /** Nach dem Speichern hochzählen: Die Verbindungsprüfung läuft dann sofort mit den neuen Angaben */
  const [checkKey, setCheckKey] = useState(0)

  useEffect(() => {
    if (!initialSettings) {
      getSmtpSettings().then((settings) => {
        setFormData(toForm(settings))
        setPassStatus(settings.passStatus)
        setMissing(settings.missing)
        setForms(settings.forms)
        setFormRecipients({ ...settings.forms.recipients })
        setCertSwitchAvailable(settings.certSwitchAvailable)
        setMsAvailable(settings.msAvailable)
        setMsSecretStatus(settings.msSecretStatus)
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
    if (certSwitchAvailable) form.append('smtp_skip_cert_check', formData.skipCertCheck ? '1' : '0')
    if (msAvailable) {
      form.append('mail_transport', formData.transport)
      form.append('ms_tenant_id', formData.msTenantId)
      form.append('ms_client_id', formData.msClientId)
      form.append('ms_client_secret', formData.msSecret)
      form.append('ms_sender', formData.msSender)
      form.append('ms_secret_expires_at', formData.msSecretExpiresAt)
    }

    try {
      const result = await saveSmtpSettings(form)
      if (result.success) {
        toast.success('E-Mail-Einstellungen gespeichert.')
        // Neuer Stand vom Server (Passwort-Status, was noch fehlt); das eingegebene Passwort leeren
        const fresh = await getSmtpSettings()
        setFormData(toForm(fresh))
        setPassStatus(fresh.passStatus)
        setMissing(fresh.missing)
        setForms(fresh.forms)
        setFormRecipients({ ...fresh.forms.recipients })
        setCertSwitchAvailable(fresh.certSwitchAvailable)
        setMsAvailable(fresh.msAvailable)
        setMsSecretStatus(fresh.msSecretStatus)
        setCheckKey((k) => k + 1)
      } else {
        // Teilweise gespeichert (z. B. Spalte fehlt): Verbindung trotzdem neu prüfen
        setCheckKey((k) => k + 1)
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
          <span>E-Mail-Einstellungen werden geladen...</span>
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
      {/* Live-Prüfung der Verbindung (ab v0.18.0): beim Öffnen und nach jedem Speichern */}
      <div className="mb-6"><SmtpStatus refreshKey={checkKey} /></div>

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
          {isMs ? (
            // Microsoft 365 sendet immer aus dem Absender-Postfach (unten bei „Versand“)
            <Field label="Absender E-Mail" hint="Bei Microsoft 365 ist das immer das Absender-Postfach.">
              <Input type="email" readOnly value={formData.msSender} placeholder="Absender-Postfach unten eintragen" />
            </Field>
          ) : (
            <Field label="Absender E-Mail">
              <Input
                type="email"
                placeholder="z.B. noreply@example.com"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              />
            </Field>
          )}
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
        title="Versand"
        description="Worüber die Website Kontaktanfragen und System-Benachrichtigungen verschickt: einen Mailserver (SMTP) oder Microsoft 365."
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
                <span className="block text-[14px] font-medium text-[#0F172A]">Versand-Einstellungen (für Techniker)</span>
                {isMs ? (
                  <span className={cx(mutedClass, 'block truncate')}>Microsoft 365{formData.msSender ? ` · ${formData.msSender}` : ''}</span>
                ) : formData.host && (
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
          {/* Ablauf des Client-Secrets auch eingeklappt sichtbar */}
          {isMs && !showAdvanced && (expiry.status === 'soon' || expiry.status === 'expired') && (
            <div className="px-5 pb-5 sm:px-6">
              <Note tone={expiry.status === 'expired' ? 'error' : 'warn'}>{secretExpiryHint(formData.msSecretExpiresAt)}</Note>
            </div>
          )}

          {showAdvanced && (
            <div className="flex flex-col gap-5 px-5 pb-6 pt-1 sm:px-6">
              {/* Versandart (ab v0.19.0) */}
              {msAvailable ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-[#0F172A]">Versandart</span>
                  <div>
                    <Segmented
                      label="Versandart"
                      value={formData.transport}
                      onChange={(v) => setFormData({ ...formData, transport: v })}
                      options={[
                        { value: 'smtp', label: 'SMTP' },
                        { value: 'microsoft365', label: 'Microsoft 365' },
                      ]}
                    />
                  </div>
                  <p className={hintClass}>
                    {isMs
                      ? 'Die Website sendet als App aus einem festen Postfach, ohne Passwort.'
                      : 'Für IONOS, Strato, All-Inkl, Google und andere. Bei Microsoft 365 bitte „Microsoft 365“ wählen.'}
                  </p>
                </div>
              ) : (
                <p className={hintClass}>Versand über Microsoft 365 (ohne Passwort) braucht noch die Datenbank-Aktualisierung für core-cms v0.19.0.</p>
              )}

              {isMs ? (
                <>
                  <Field
                    label="Absender-Postfach"
                    hint="Aus diesem Postfach gehen alle E-Mails raus, z. B. ein freigegebenes Postfach."
                  >
                    <Input
                      type="email"
                      required
                      placeholder="z.B. anfragen@example.com"
                      value={formData.msSender}
                      onChange={(e) => setFormData({ ...formData, msSender: e.target.value })}
                    />
                  </Field>

                  <div className="flex flex-col gap-4 border-t border-[#F1F5F9] pt-5">
                    <div>
                      <span className="block text-[13px] font-medium text-[#0F172A]">Zugang aus Entra ID</span>
                      <span className={hintClass}>Aus der App-Registrierung. Die App muss in Exchange auf das Absender-Postfach beschränkt sein.</span>
                    </div>
                    <FieldGrid>
                      <Field label="Tenant-ID" hint="Übersicht → Mandanten-ID">
                        <Input
                          type="text"
                          required
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="GUID oder firma.onmicrosoft.com"
                          value={formData.msTenantId}
                          onChange={(e) => setFormData({ ...formData, msTenantId: e.target.value })}
                        />
                      </Field>
                      <Field label="Client-ID" hint="App-Registrierungen → deine App">
                        <Input
                          type="text"
                          required
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="GUID der Anwendung"
                          value={formData.msClientId}
                          onChange={(e) => setFormData({ ...formData, msClientId: e.target.value })}
                        />
                      </Field>
                      {/* Wie beim SMTP-Passwort: Das gespeicherte Secret kommt nie in den Browser */}
                      <Field
                        label="Client-Secret"
                        hint={
                          msSecretStatus === 'saved'
                            ? 'Gespeichert. Leer lassen, um es zu behalten.'
                            : msSecretStatus === 'unreadable'
                              ? 'Nicht mehr lesbar. Bitte neu eingeben.'
                              : 'Den Wert, nicht die ID. Wird verschlüsselt gespeichert.'
                        }
                      >
                        <Input
                          type="password"
                          required={msSecretStatus !== 'saved'}
                          autoComplete="new-password"
                          placeholder={msSecretStatus === 'saved' ? '•••••••• (gespeichert)' : 'Secret eingeben'}
                          value={formData.msSecret}
                          onChange={(e) => setFormData({ ...formData, msSecret: e.target.value })}
                        />
                      </Field>
                      <Field
                        label="Secret gültig bis"
                        hint={
                          expiry.status === 'ok'
                            ? `Noch ${expiry.days} Tage gültig. Wir erinnern dich 30 Tage vorher.`
                            : `Höchstens ${SECRET_MAX_MONTHS} Monate. Wir erinnern dich 30 Tage vorher.`
                        }
                      >
                        <Input
                          type="date"
                          value={formData.msSecretExpiresAt}
                          onChange={(e) => setFormData({ ...formData, msSecretExpiresAt: e.target.value })}
                        />
                      </Field>
                    </FieldGrid>
                    {(expiry.status === 'expired' || expiry.status === 'soon') && (
                      <Note tone={expiry.status === 'expired' ? 'error' : 'warn'}>{secretExpiryHint(formData.msSecretExpiresAt)}</Note>
                    )}
                  </div>
                </>
              ) : (
              <>
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
                {/* Kein „Passwort anzeigen“: Das gespeicherte Passwort kommt nie in den Browser, es gäbe nichts anzuzeigen */}
                <Field
                  label="Passwort / API-Key"
                  hint={
                    passStatus === 'saved'
                      ? 'Gespeichert. Leer lassen, um es zu behalten.'
                      : passStatus === 'unreadable'
                        ? 'Das gespeicherte Passwort lässt sich nicht mehr lesen. Bitte neu eingeben.'
                        : 'Wird verschlüsselt gespeichert.'
                  }
                >
                  <Input
                    type="password"
                    required={passStatus !== 'saved'}
                    autoComplete="new-password"
                    placeholder={passStatus === 'saved' ? '•••••••• (gespeichert)' : 'Passwort eingeben'}
                    value={formData.pass}
                    onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* Zertifikat (ab v0.18.0): Standard ist prüfen. Ausschalten nur für eigene Server mit selbst ausgestelltem Zertifikat. */}
              {certSwitchAvailable ? (
                <div className="flex flex-col gap-3">
                  <SwitchRow
                    divider
                    label="Zertifikat des Mailservers nicht prüfen"
                    hint="Nur für einen eigenen Mailserver mit selbst ausgestelltem Zertifikat. Die Verbindung bleibt verschlüsselt, ist aber nicht mehr gegen gefälschte Server geschützt. Bei Anbietern wie IONOS, Strato, Google oder Microsoft immer aus lassen."
                    checked={formData.skipCertCheck}
                    onChange={(e) => setFormData({ ...formData, skipCertCheck: e.target.checked })}
                  />
                  {formData.skipCertCheck && (
                    <Note tone="warn">Die Prüfung des Zertifikats ist ausgeschaltet. Schalte sie wieder ein, sobald dein Mailserver ein gültiges Zertifikat hat.</Note>
                  )}
                </div>
              ) : (
                <p className={cx(hintClass, 'border-t border-[#F1F5F9] pt-5')}>
                  Das Zertifikat des Mailservers wird immer geprüft. Der Schalter für Ausnahmen braucht noch die Datenbank-Aktualisierung für core-cms v0.18.0.
                </p>
              )}
              </>
              )}
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
          <span>E-Mail-Einstellungen speichern</span>
        </Button>
      </SaveBar>
    </form>
  )
}
