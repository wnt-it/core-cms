'use client'

// Einstellungen der Datenschutz-Vorlage im Admin: Firma, Kontakt, zuschaltbare Bausteine. Mit „Text aus Vorlage
// erzeugen“ entsteht daraus die Datenschutzerklärung (die bisherige wird vorher gesichert).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Badge, Button, Card, Field, FieldGrid, Input, Note, Section, Select, SwitchRow, Textarea } from '../../ui/components'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { applyDatenschutzVorlage, saveDatenschutzVorlage } from './actions'
import {
  DATENSCHUTZ_MODULE_LABELS,
  DATENSCHUTZ_TEMPLATE_CHANGES,
  DATENSCHUTZ_TEMPLATE_VERSION,
  type DatenschutzConfig,
} from './datenschutz'

export default function TemplatePanel({
  initial,
  savedVersion,
  appliedAt,
  settingsSaved,
  publicPath,
}: {
  initial: DatenschutzConfig
  /** Version der Vorlage, aus der der Text zuletzt erzeugt wurde (null: noch nie) */
  savedVersion: string | null
  appliedAt: string | null
  /** false: die Werte sind Vorschläge aus den Website-Einstellungen */
  settingsSaved: boolean
  publicPath?: string
}) {
  const router = useRouter()
  const [config, setConfig] = useState<DatenschutzConfig>(initial)
  const [saved, setSaved] = useState<DatenschutzConfig>(initial)
  const [version, setVersion] = useState<string | null>(savedVersion)
  const [open, setOpen] = useState(!settingsSaved || (savedVersion !== null && savedVersion !== DATENSCHUTZ_TEMPLATE_VERSION))
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()

  const outdated = version !== null && version !== DATENSCHUTZ_TEMPLATE_VERSION
  const news = outdated ? DATENSCHUTZ_TEMPLATE_CHANGES.filter((c) => c.version > (version as string)) : []
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)

  const set = <K extends keyof DatenschutzConfig>(key: K, value: DatenschutzConfig[K]) => setConfig((c) => ({ ...c, [key]: value }))
  const setModule = (key: keyof DatenschutzConfig['module'], value: boolean) => setConfig((c) => ({ ...c, module: { ...c.module, [key]: value } }))
  const text = (key: keyof DatenschutzConfig, props: { label: string; hint?: string; optional?: boolean; placeholder?: string }) => (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <Input value={config[key] as string} onChange={(e) => set(key, e.target.value as never)} placeholder={props.placeholder} maxLength={1000} />
    </Field>
  )

  const saveSettings = () =>
    start(async () => {
      const res = await saveDatenschutzVorlage({ config, version })
      if (!res.success) return void toast.error(res.error)
      setSaved(config)
      toast.success('Einstellungen gespeichert. Der Text bleibt unverändert.')
      router.refresh()
    })

  const apply = () =>
    start(async () => {
      setConfirm(false)
      const res = await applyDatenschutzVorlage({ config, publicPath })
      if (!res.success) return void toast.error(res.error)
      setSaved(config)
      setVersion(DATENSCHUTZ_TEMPLATE_VERSION)
      toast.success('Text aus der Vorlage erzeugt und gespeichert. Der bisherige Text liegt als Sicherung in der Datenbank.')
      // Der Editor darunter zeigt den neuen Text nach dem Neuladen
      window.location.reload()
    })

  return (
    <Section
      title="Vorlage"
      description="Die Datenschutzerklärung entsteht aus der gemeinsamen Vorlage von WNT-IT. Hier stehen die Angaben dieser Website und die zuschaltbaren Bausteine."
      bare
    >
      {/* Dauerhafter Hinweis, auch bei eingeklapptem Panel */}
      <div className="mb-3">
        <Note tone="warn">
          <strong>Hinweis:</strong> „Text aus Vorlage erzeugen“ ersetzt immer den <strong>ganzen</strong> Text durch die Vorlage. Änderungen, die Sie im Editor am Text gemacht haben, gehen dabei verloren. Ein Abgleich einzelner Abschnitte ist nicht möglich. Der bisherige Text wird vorher gesichert. Bei neuen Vorlagenversionen deshalb Änderungen aus der Liste unten gezielt von Hand im Editor nachtragen, wenn der Text sonst stimmt.
        </Note>
      </div>
      <Card padded={false}>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="flex-1 text-[14px] font-medium text-[#0F172A]">Einstellungen der Vorlage</span>
          {outdated ? <Badge tone="amber" dot>Neue Vorlage verfügbar</Badge> : version ? <Badge tone="green" dot>Vorlage {version}</Badge> : <Badge>Noch nicht aus Vorlage erzeugt</Badge>}
        </button>

        {open && (
          <div className="flex flex-col gap-6 border-t border-[#F1F5F9] p-5">
            {outdated && (
              <Note tone="warn">
                <strong>Neue Vorlage vom {DATENSCHUTZ_TEMPLATE_VERSION}</strong>
                {appliedAt ? ` (Ihr Text beruht auf der Vorlage vom ${version})` : ''}. Was sich geändert hat:
                <ul className="mt-1 list-disc pl-5">
                  {news.map((c) => (
                    <li key={c.version}>
                      {c.version}: {c.text}
                    </li>
                  ))}
                </ul>
                „Text aus Vorlage erzeugen“ übernimmt die neue Vorlage komplett. Eigene Änderungen im Text gehen dabei verloren (der bisherige Text wird gesichert).
              </Note>
            )}
            {!version && (
              <Note tone="info">
                Der vorhandene Text wurde noch nicht mit der Vorlage verknüpft. „Text aus Vorlage erzeugen“ ersetzt den ganzen Text durch die Vorlage mit den Angaben unten (der bisherige Text wird gesichert).
              </Note>
            )}
            {!settingsSaved && <Note tone="info">Die Angaben sind Vorschläge aus den Website-Einstellungen. Bitte prüfen und ergänzen.</Note>}

            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-[#0F172A]">Verantwortlicher</h3>
              <FieldGrid>
                {text('firma', { label: 'Firma', placeholder: 'Muster GmbH' })}
                {text('kurzname', { label: 'Kurzname für den Titel', hint: 'Ergibt „Datenschutzerklärung <Kurzname> Webseiten“.', placeholder: 'Muster' })}
                {text('strasse', { label: 'Straße und Hausnummer' })}
                <FieldGrid>
                  {text('plz', { label: 'PLZ' })}
                  {text('ort', { label: 'Ort' })}
                </FieldGrid>
                {text('telefon', { label: 'Telefon' })}
                {text('email', { label: 'E-Mail-Adresse' })}
                {text('datenschutzEmail', { label: 'E-Mail für Datenschutzanfragen', placeholder: 'datenschutz@…' })}
                {text('datenschutzbeauftragter', { label: 'Datenschutzbeauftragter', optional: true, hint: 'Name und Anschrift, falls bestellt. Sonst bleibt ein Platzhalter im Text.' })}
                {text('domains', { label: 'Domains der Webseiten', hint: 'z. B. „muster.de und muster.com“.' })}
                {text('bundesland', { label: 'Bundesland (Sitz)' })}
              </FieldGrid>
              <div className="mt-5">
                <Field label="Zuständige Aufsichtsbehörde" hint="Mit Anschrift. Vorbelegt ist Baden-Württemberg, bei anderem Sitz anpassen.">
                  <Textarea value={config.aufsicht} onChange={(e) => set('aufsicht', e.target.value)} maxLength={1000} style={{ minHeight: 64 }} />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-[#0F172A]">Technik</h3>
              <FieldGrid>
                <Field label="Standort der Datenbank" hint="Region des Supabase-Projekts.">
                  <Select value={config.datenbankStandort} onChange={(e) => set('datenbankStandort', e.target.value as DatenschutzConfig['datenbankStandort'])}>
                    <option value="irland">Irland (EU)</option>
                    <option value="frankfurt">Frankfurt am Main (Deutschland)</option>
                    <option value="sonstiger">Anderer Standort (Platzhalter)</option>
                  </Select>
                </Field>
                <Field label="E-Mail-Versanddienst" hint="Dienst hinter den SMTP-Einstellungen.">
                  <Select value={config.emailDienst} onChange={(e) => set('emailDienst', e.target.value as DatenschutzConfig['emailDienst'])}>
                    <option value="microsoft365">Microsoft 365 (Exchange Online)</option>
                    <option value="sonstiger">Anderer Dienst (Platzhalter)</option>
                  </Select>
                </Field>
                {text('consentKey', { label: 'Name des Cookie-Eintrags', hint: 'Aus dem Cookie-Banner der Website, z. B. „ane_consent“.' })}
                {text('verlinkt', { label: 'Verlinkte externe Seiten', hint: 'Satzteil, z. B. „zu unseren Profilen bei Instagram und LinkedIn“.' })}
              </FieldGrid>
            </div>

            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-[#0F172A]">Formulare</h3>
              <FieldGrid>
                {text('weitereFormulare', { label: 'Weitere Formulare', optional: true, hint: 'Neben dem Kontaktformular, z. B. „das Formular zur Mietverwaltung“.' })}
                {text('weitereFormularDaten', { label: 'Zusätzliche Angaben in diesen Formularen', optional: true, hint: 'Satzteil, z. B. „beim Formular zur Mietverwaltung die Angaben zur Wohnung“.' })}
              </FieldGrid>
            </div>

            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-[#0F172A]">Zuschaltbare Bausteine</h3>
              <div className="flex flex-col gap-4">
                {(Object.keys(DATENSCHUTZ_MODULE_LABELS) as (keyof DatenschutzConfig['module'])[]).map((k) => (
                  <SwitchRow key={k} label={DATENSCHUTZ_MODULE_LABELS[k].label} hint={DATENSCHUTZ_MODULE_LABELS[k].hint} checked={config.module[k]} onChange={(e) => setModule(k, e.target.checked)} />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-5">
              <Button onClick={saveSettings} disabled={pending || !dirty}>
                {pending && <Loader2 size={15} className="animate-spin" />}
                Einstellungen speichern
              </Button>
              <Button variant="primary" onClick={() => setConfirm(true)} disabled={pending}>
                Text aus Vorlage erzeugen
              </Button>
              <span className="text-[12.5px] text-[#64748B]">Vorlage {DATENSCHUTZ_TEMPLATE_VERSION}</span>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog open={confirm} title="Text aus der Vorlage erzeugen?" confirmLabel="Erzeugen und speichern" onConfirm={apply} onCancel={() => setConfirm(false)} pending={pending} danger={false}>
        Die Datenschutzerklärung wird komplett durch die Vorlage (Version {DATENSCHUTZ_TEMPLATE_VERSION}) mit den Angaben oben ersetzt und sofort gespeichert, also auch auf der Website sichtbar. Eigene Änderungen im Text gehen verloren. Der bisherige Text wird vorher als Sicherung in der Datenbank abgelegt.
      </ConfirmDialog>
    </Section>
  )
}
