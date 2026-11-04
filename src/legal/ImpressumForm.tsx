'use client'

// Formular für das Impressum: Pflichtangaben nach § 5 DDG als Felder, je Abschnitt mit Gesetzesstelle.
// Abschnitte, die nicht für jeden gelten, lassen sich als „Nicht anwendbar“ markieren.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Note, SaveBar, Section, Select, Textarea } from '../ui/components'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { saveImpressum } from './impressum-actions'
import { DDG_5_URL, IMPRESSUM_SECTIONS, impressumToBlocks, missingImpressumFields, type ImpressumData } from './impressum'

export default function ImpressumForm({
  slug,
  initial,
  template,
  publicPath,
  fromDatabase,
}: {
  slug: string
  initial: ImpressumData
  /** Vorlage aus dem Projekt, auf die zurückgesetzt werden kann. */
  template?: ImpressumData
  /** Öffentliche Seite, z. B. „/impressum“. */
  publicPath?: string
  /** false: noch nie gespeichert, es wird die Vorlage angezeigt. */
  fromDatabase: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<ImpressumData>(initial)
  const [saved, setSaved] = useState<ImpressumData>(initial)
  const [isSaved, setIsSaved] = useState(fromDatabase)
  const [showErrors, setShowErrors] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [saving, startSave] = useTransition()

  const dirty = !isSaved || JSON.stringify(data) !== JSON.stringify(saved)
  const missing = useMemo(() => missingImpressumFields(data), [data])
  const preview = useMemo(() => impressumToBlocks(data), [data])

  const setNa = (id: string, na: boolean) => setData((d) => ({ ...d, [id]: { ...d[id], na } }))
  const setValue = (id: string, field: string, value: string) => setData((d) => ({ ...d, [id]: { ...d[id], v: { ...d[id].v, [field]: value } } }))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (missing.length > 0) {
      setShowErrors(true)
      toast.error('Bitte zuerst die Pflichtangaben ausfüllen oder den Abschnitt als „Nicht anwendbar“ markieren.')
      return
    }
    startSave(async () => {
      const res = await saveImpressum({ slug, data, publicPath })
      if (!res.success) {
        toast.error(res.error || 'Fehler beim Speichern.')
        return
      }
      setSaved(data)
      setIsSaved(true)
      toast.success('Gespeichert. Das Impressum ist auf der Website sichtbar.')
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="flex flex-col">
      <div className="flex flex-col gap-3 pt-6">
        {!isSaved && (
          <Note tone="info">Bisher ist hier nichts gespeichert. Angezeigt werden die vorbereiteten Angaben aus dem Projekt. Mit dem ersten Speichern werden sie übernommen.</Note>
        )}
        <Note
          tone="info"
          action={
            <a href={DDG_5_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0F172A] underline">
              § 5 DDG lesen <ExternalLink size={13} />
            </a>
          }
        >
          Die Felder entsprechen den Pflichtangaben nach § 5 DDG (Digitale-Dienste-Gesetz). Gilt ein Abschnitt für den Betrieb nicht, „Nicht anwendbar“ wählen, dann erscheint er nicht im Impressum.
        </Note>
      </div>

      {IMPRESSUM_SECTIONS.map((s) => {
        const d = data[s.id]
        const canBeNA = s.naByDefault !== undefined
        return (
          <Section
            key={s.id}
            title={s.title}
            description={
              <>
                <span className="mb-1 block font-medium text-[#0F172A]">{s.law}</span>
                {s.description}
              </>
            }
          >
            {canBeNA && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-[280px]">
                  <Select value={d.na ? 'na' : 'yes'} onChange={(e) => setNa(s.id, e.target.value === 'na')} aria-label={`${s.title}: trifft zu oder nicht anwendbar`}>
                    <option value="yes">Trifft zu: Angaben machen</option>
                    <option value="na">Nicht anwendbar</option>
                  </Select>
                </div>
                {d.na && <Badge>Erscheint nicht im Impressum</Badge>}
              </div>
            )}
            {!d.na &&
              s.fields.map((f) => {
                const empty = !d.v[f.id]?.trim()
                const error = showErrors && f.required && empty ? 'Pflichtangabe' : undefined
                return (
                  <Field key={f.id} label={f.label} optional={!f.required} hint={f.hint} error={error}>
                    {f.type === 'textarea' ? (
                      <Textarea value={d.v[f.id]} onChange={(e) => setValue(s.id, f.id, e.target.value)} placeholder={f.placeholder} maxLength={4000} aria-invalid={error ? true : undefined} />
                    ) : (
                      <Input value={d.v[f.id]} onChange={(e) => setValue(s.id, f.id, e.target.value)} placeholder={f.placeholder} maxLength={4000} aria-invalid={error ? true : undefined} />
                    )}
                  </Field>
                )
              })}
          </Section>
        )
      })}

      <Section title="Vorschau" description="So erscheint das Impressum auf der Website (ohne Gestaltung)." bare>
        <Card>
          <div className="flex flex-col gap-3 text-[14px] text-[#334155]">
            {preview.map((b, i) =>
              b.t === 'h2' ? (
                <p key={i} className="pt-2 font-semibold text-[#0F172A]">{b.text}</p>
              ) : (
                <p key={i} className="whitespace-pre-line">{b.text}</p>
              ),
            )}
          </div>
        </Card>
      </Section>

      <SaveBar
        start={
          missing.length > 0 ? (
            <span className="text-[13px] text-[#92400E]">Es fehlen noch {missing.length} Pflichtangabe{missing.length === 1 ? '' : 'n'}.</span>
          ) : template ? (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={saving}>
              <RotateCcw size={15} /> Auf Vorlage zurücksetzen
            </Button>
          ) : (
            <span className="text-[13px] text-[#64748B]">Änderungen sind nach dem Speichern sofort sichtbar.</span>
          )
        }
      >
        {publicPath && (
          <a href={publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-[14px] font-medium text-[#334155] hover:bg-[#F1F5F9]">
            Seite ansehen
          </a>
        )}
        <Button variant="ghost" onClick={() => setData(saved)} disabled={!dirty || saving}>
          Verwerfen
        </Button>
        <Button type="submit" variant="primary" disabled={saving || !dirty}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Speichern
        </Button>
      </SaveBar>

      <ConfirmDialog
        open={confirmReset}
        title="Auf die Vorlage zurücksetzen?"
        confirmLabel="Vorlage laden"
        onConfirm={() => {
          if (template) setData(template)
          setConfirmReset(false)
          toast.success('Vorlage geladen. Erst mit „Speichern“ wird sie übernommen.')
        }}
        onCancel={() => setConfirmReset(false)}
      >
        Alle Änderungen im Formular werden durch die Vorlage aus dem Projekt ersetzt. Gespeichert wird erst mit „Speichern“.
      </ConfirmDialog>
    </form>
  )
}
