'use client'

// Einstellungen der Datenschutz-Vorlage im Admin: Firma und Kontakt. „Text aus Vorlage holen“ zeigt zuerst, was sich an den
// Abschnitten der Vorlage ändert; alle anderen bleiben (siehe merge.ts). Der bisherige Text wird vorher gesichert.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Badge, Button, Card, Field, FieldGrid, Input, Note, Section, Select, SwitchRow } from '../../ui/components'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { applyDatenschutzVorlage, previewDatenschutzVorlage, restoreDatenschutzSicherung, saveDatenschutzVorlage } from './actions'
import type { DatenschutzSicherung } from './vorlage'
import { wordDiff, type VorlageVorschau } from './merge'
import { compareVorlageVersion } from './vorlage-text'
import {
  DATENSCHUTZ_STANDARD_BAUSTEINE,
  type DatenschutzConfig,
} from './datenschutz'
import { BUNDESLAENDER, aufsichtText } from './aufsichtsbehoerden'

/** Zeigt wortweise, was sich von alt zu neu ändert: Neues grün, Entferntes rot und durchgestrichen. */
function DiffText({ alt, neu }: { alt: string; neu: string }) {
  return (
    <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#334155]">
      {wordDiff(alt, neu).map((part, i) =>
        part.type === 'gleich' ? (
          <span key={i}>{part.text}</span>
        ) : part.type === 'neu' ? (
          <ins key={i} className="rounded bg-[#DCFCE7] text-[#166534] no-underline">{part.text}</ins>
        ) : (
          <del key={i} className="rounded bg-[#FEE2E2] text-[#991B1B]">{part.text}</del>
        ),
      )}
    </p>
  )
}

export default function TemplatePanel({
  initial,
  savedVersion,
  appliedAt,
  settingsSaved,
  sicherungen = [],
  publicPath,
  vorlageVersion,
  vorlageChanges,
}: {
  initial: DatenschutzConfig
  /** Version der Vorlage, aus der der Text zuletzt erzeugt wurde (null: noch nie) */
  savedVersion: string | null
  appliedAt: string | null
  /** false: die Werte sind Vorschläge aus den Website-Einstellungen */
  settingsSaved: boolean
  /** Gesicherte frühere Texte, neueste zuerst */
  sicherungen?: DatenschutzSicherung[]
  publicPath?: string
  /** Neueste Fassung der Vorlage (aus dem Repo oder mitgeliefert) */
  vorlageVersion: string
  vorlageChanges: { version: string; text: string }[]
}) {
  const router = useRouter()
  const [config, setConfig] = useState<DatenschutzConfig>(initial)
  const [saved, setSaved] = useState<DatenschutzConfig>(initial)
  const [version, setVersion] = useState<string | null>(savedVersion)
  const [open, setOpen] = useState(!settingsSaved || (savedVersion !== null && compareVorlageVersion(vorlageVersion, savedVersion) > 0))
  const [vorschau, setVorschau] = useState<(VorlageVorschau & { version: string }) | null>(null)
  const [restore, setRestore] = useState<DatenschutzSicherung | null>(null)
  const [pending, start] = useTransition()

  const outdated = version !== null && compareVorlageVersion(vorlageVersion, version) > 0
  const news = outdated ? vorlageChanges.filter((c) => compareVorlageVersion(c.version, version) > 0) : []
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)

  const set = <K extends keyof DatenschutzConfig>(key: K, value: DatenschutzConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }))
    // Die Vorschau gehört zu den alten Angaben: Übernommen werden soll nur, was zu sehen war
    setVorschau(null)
  }
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

  const loadVorschau = () =>
    start(async () => {
      const res = await previewDatenschutzVorlage({ config })
      if (!res.success) return void toast.error(res.error)
      setVorschau({ ...res.vorschau, version: res.vorlageVersion })
    })

  const apply = () =>
    start(async () => {
      if (!vorschau) return
      const res = await applyDatenschutzVorlage({ config, vorlageVersion: vorschau.version, publicPath })
      if (!res.success) return void toast.error(res.error)
      setVorschau(null)
      setSaved(config)
      setVersion(vorschau.version)
      toast.success('Vorlage übernommen und gespeichert. Der bisherige Text liegt unter „Sicherungen“ bereit.')
      // Der Editor darunter zeigt den neuen Text nach dem Neuladen
      window.location.reload()
    })

  const doRestore = () => {
    const target = restore
    if (!target) return
    start(async () => {
      setRestore(null)
      const res = await restoreDatenschutzSicherung({ slug: target.slug, publicPath })
      if (!res.success) return void toast.error(res.error)
      toast.success('Sicherung wiederhergestellt. Der Text davor liegt jetzt selbst als Sicherung bereit.')
      // Der Editor darunter zeigt den wiederhergestellten Text nach dem Neuladen
      window.location.reload()
    })
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Section
      title="Vorlage"
      description="Die Datenschutzerklärung entsteht aus der gemeinsamen Vorlage von WNT-IT. Hier stehen die Angaben dieser Website und die Bausteine."
      bare
    >
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
                <strong>Neue Vorlage vom {vorlageVersion}</strong>
                {appliedAt ? ` (Ihr Text beruht auf der Vorlage vom ${version})` : ''}. Was sich geändert hat:
                <ul className="mt-1 list-disc pl-5">
                  {news.map((c) => (
                    <li key={c.version}>
                      {c.version}: {c.text}
                    </li>
                  ))}
                </ul>
                „Text aus Vorlage holen“ zeigt zuerst, was sich an den Abschnitten der Vorlage ändert. Alle anderen Abschnitte bleiben unverändert.
              </Note>
            )}
            {!version && (
              <Note tone="info">
                Der vorhandene Text wurde noch nicht mit der Vorlage abgeglichen. „Text aus Vorlage holen“ zeigt zuerst, was sich an den Abschnitten der Vorlage ändert. Alle anderen Abschnitte bleiben unverändert.
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
                {text('telefon', { label: 'Telefon', optional: true, hint: 'Ohne Angabe erscheint keine Telefonzeile.' })}
                {text('email', { label: 'E-Mail-Adresse' })}
                {text('datenschutzEmail', { label: 'E-Mail für Datenschutzanfragen', placeholder: 'datenschutz@…' })}
                {text('datenschutzbeauftragter', { label: 'Datenschutzbeauftragter', optional: true, hint: 'Name, falls bestellt. Sonst wird nur die Firma genannt.' })}
                {text('domains', { label: 'Domains der Webseiten', hint: 'z. B. „muster.de und muster.com“.' })}
                <Field label="Bundesland (Sitz)" hint="Bestimmt die Aufsichtsbehörde im Text.">
                  <Select value={config.bundesland} onChange={(e) => set('bundesland', e.target.value)}>
                    <option value="">Bitte wählen</option>
                    {BUNDESLAENDER.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </Select>
                </Field>
              </FieldGrid>
              {config.bundesland && (
                <div className="mt-5">
                  <Note tone="info">
                    <strong>Aufsichtsbehörde im Text:</strong>
                    <span className="mt-1 block whitespace-pre-line">{aufsichtText(config.bundesland)}</span>
                  </Note>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-1 text-[14px] font-semibold text-[#0F172A]">Bausteine der Vorlage</h3>
              <p className="mb-3 text-[12.5px] text-[#64748B]">Alles andere, z. B. Karten, Videos oder Newsletter, kommt unten im Editor als eigener Abschnitt in den Text und bleibt beim Holen der Vorlage erhalten.</p>
              <div className="mb-4">
                <Note tone="info">
                  <strong>Was die Schalter bewirken:</strong>
                  <span className="mt-1 block">
                    <strong>An:</strong> Der Abschnitt wird beim Holen aus der Vorlage in den Text übernommen und dabei immer auf den neuesten Stand der Vorlage gebracht.
                  </span>
                  <span className="mt-1 block">
                    <strong>Aus:</strong> Der Abschnitt wird beim Holen aus dem Text entfernt, Hinweise darauf in anderen Abschnitten ebenfalls. Er wird nicht mehr aktualisiert.
                  </span>
                  <span className="mt-1 block">
                    Das Umstellen allein ändert die veröffentlichte Datenschutzerklärung nicht. Erst „Text aus Vorlage holen“ zeigt eine Vorschau mit allen Änderungen, und erst „Übernehmen und speichern“ ändert den Text auf der Website. Der bisherige Text wird vorher gesichert.
                  </span>
                </Note>
              </div>
              <div className="flex flex-col gap-4">
                {DATENSCHUTZ_STANDARD_BAUSTEINE.map((b) =>
                  b.schalter ? (
                    <SwitchRow key={b.label} label={b.label} hint={b.hint} checked={config[b.schalter]} onChange={(e) => set(b.schalter!, e.target.checked)} />
                  ) : (
                    <div key={b.label} className="opacity-60 [&_label]:cursor-not-allowed">
                      <SwitchRow label={b.label} hint={`Immer enthalten. ${b.hint}`} checked disabled readOnly />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-5">
              <Button onClick={saveSettings} disabled={pending || !dirty}>
                {pending && <Loader2 size={15} className="animate-spin" />}
                Einstellungen speichern
              </Button>
              <Button variant="primary" onClick={loadVorschau} disabled={pending}>
                Text aus Vorlage holen
              </Button>
              <span className="text-[12.5px] text-[#64748B]">Vorlage {vorlageVersion}</span>
            </div>

            {vorschau && (
              <div className="flex flex-col gap-4 border-t border-[#F1F5F9] pt-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A]">Das ändert sich</h3>
                  <p className="mt-1 text-[12.5px] text-[#64748B]">
                    {vorschau.aenderungen.length === 0
                      ? 'Die Abschnitte der Vorlage entsprechen bereits Ihrem Text.'
                      : `${vorschau.aenderungen.length} ${vorschau.aenderungen.length === 1 ? 'Abschnitt ändert' : 'Abschnitte ändern'} sich. Neuer Text ist grün, entfernter rot und durchgestrichen.`}
                  </p>
                </div>
                {vorschau.aenderungen.map((a) => (
                  <div key={`${a.titel}-${a.neu ? 'neu' : 'weg'}`} className="rounded-lg border border-[#E2E8F0] p-4">
                    <p className="text-[13.5px] font-medium text-[#0F172A]">{a.titel}</p>
                    {a.frueher && <p className="text-[12.5px] text-[#64748B]">Bisher: {a.frueher}</p>}
                    {!a.alt && <p className="text-[12.5px] text-[#64748B]">Neuer Abschnitt</p>}
                    {!a.neu && <p className="text-[12.5px] text-[#64748B]">Abschnitt entfällt</p>}
                    <div className="mt-2">
                      <DiffText alt={a.alt} neu={a.neu} />
                    </div>
                  </div>
                ))}
                {vorschau.eigene.length > 0 && (
                  <div>
                    <p className="text-[13.5px] font-medium text-[#0F172A]">Diese eigenen Abschnitte bleiben unverändert</p>
                    <ul className="mt-1 list-disc pl-5 text-[13px] text-[#334155]">
                      {vorschau.eigene.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" onClick={apply} disabled={pending}>
                    {pending && <Loader2 size={15} className="animate-spin" />}
                    Übernehmen und speichern
                  </Button>
                  <Button variant="ghost" onClick={() => setVorschau(null)} disabled={pending}>
                    Abbrechen
                  </Button>
                  <span className="text-[12.5px] text-[#64748B]">Der Text ist danach sofort auf der Website sichtbar. Der bisherige Text wird vorher gesichert.</span>
                </div>
              </div>
            )}

          </div>
        )}
      </Card>

      <div className="mt-3">
        <Card padded={false}>
          <div className="p-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Sicherungen</h3>
            <p className="mt-1 text-[12.5px] text-[#64748B]">
              Vor jedem „Text aus Vorlage holen“ und jeder Wiederherstellung wird der bisherige Text hier abgelegt (die letzten 10). Nur im Admin sichtbar, nicht auf der Website.
            </p>
          </div>
          {sicherungen.length === 0 ? (
            <p className="border-t border-[#F1F5F9] p-4 text-[13px] text-[#64748B]">Noch keine Sicherung vorhanden.</p>
          ) : (
            <ul className="divide-y divide-[#F1F5F9] border-t border-[#F1F5F9]">
              {sicherungen.map((s) => (
                <li key={s.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-[#0F172A]">Text vom Stand {fmt(s.savedAt)}</p>
                    <p className="truncate text-[12.5px] text-[#64748B]">
                      {s.title}
                      {s.version ? `, Fassung ${s.version}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setRestore(s)} disabled={pending}>
                    Wiederherstellen
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog open={restore !== null} title="Sicherung wiederherstellen?" confirmLabel="Wiederherstellen" onConfirm={doRestore} onCancel={() => setRestore(null)} pending={pending} danger={false}>
        Die Datenschutzerklärung wird durch den Text vom Stand {restore ? fmt(restore.savedAt) : ''} ersetzt und sofort gespeichert, also auch auf der Website sichtbar. Der jetzige Text wird vorher selbst als Sicherung abgelegt.
      </ConfirmDialog>

    </Section>
  )
}
