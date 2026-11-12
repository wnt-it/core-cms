'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import ImageUpload from '../media/ImageUpload'
import { Button, Field, FieldGrid, Input, Note, SaveBar, Section, Select, SwitchRow, Textarea } from '../ui/components'
import { savePopupSettings } from './actions'
import type { SitePopupSettings } from './get-site-popup'
import {
  POPUP_FREQUENCIES,
  POPUP_FREQUENCY_LABELS,
  POPUP_MAX_DELAY,
  POPUP_PAGES,
  POPUP_PAGES_LABELS,
  type PopupFrequency,
  type PopupPages,
} from './options'

export default function PopupForm({ initial, placement }: { initial: SitePopupSettings; placement?: string }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [imageUrl, setImageUrl] = useState(initial.imageUrl)
  const [alt, setAlt] = useState(initial.alt)
  const [from, setFrom] = useState(initial.from)
  const [until, setUntil] = useState(initial.until)
  const [frequency, setFrequency] = useState<PopupFrequency>(initial.frequency)
  const [delay, setDelay] = useState(String(initial.delaySeconds))
  const [pages, setPages] = useState<PopupPages>(initial.pages)
  const [paths, setPaths] = useState(initial.paths)
  const [saving, startSave] = useTransition()

  const dirty =
    enabled !== initial.enabled ||
    imageUrl !== initial.imageUrl ||
    alt !== initial.alt ||
    from !== initial.from ||
    until !== initial.until ||
    frequency !== initial.frequency ||
    delay !== String(initial.delaySeconds) ||
    pages !== initial.pages ||
    paths !== initial.paths

  const rangeInvalid = Boolean(from && until && until < from)
  const delayNum = Number(delay)
  const delayInvalid = !/^\d+$/.test(delay.trim()) || delayNum > POPUP_MAX_DELAY
  const pathsMissing = pages === 'custom' && !paths.trim()

  const reset = () => {
    setEnabled(initial.enabled)
    setImageUrl(initial.imageUrl)
    setAlt(initial.alt)
    setFrom(initial.from)
    setUntil(initial.until)
    setFrequency(initial.frequency)
    setDelay(String(initial.delaySeconds))
    setPages(initial.pages)
    setPaths(initial.paths)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startSave(async () => {
      const res = await savePopupSettings({ enabled, imageUrl, alt, from, until, frequency, delaySeconds: delayNum, pages, paths })
      if (!res.success) {
        toast.error(res.error || 'Fehler beim Speichern.')
        return
      }
      toast.success(enabled ? 'Pop-up gespeichert und eingeschaltet.' : 'Pop-up gespeichert.')
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="flex flex-col">
      <Section
        title="Pop-up"
        description={placement ?? 'Erscheint beim Öffnen der Website. Wann, wie oft und auf welchen Seiten, stellst du unten ein.'}
      >
        <div className="flex flex-col gap-5">
          <SwitchRow
            label="Pop-up anzeigen"
            hint={enabled ? 'Sichtbar für alle Besucher, sobald gespeichert (im eingestellten Zeitraum).' : 'Aus. Besucher sehen kein Pop-up.'}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="border-t border-[#F1F5F9] pt-5">
            <Field label="Bild im Pop-up" hint="Hochformat oder quadratisch, Text gut lesbar auch auf dem Handy.">
              <ImageUpload value={imageUrl} onChange={setImageUrl} folder="popup" />
            </Field>
          </div>
          <Field label="Bildbeschreibung" hint="Für Screenreader und Suchmaschinen, z. B. „Betriebsferien vom 1. bis 15. August“.">
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Was steht auf dem Bild?" />
          </Field>
          {enabled && !imageUrl && <Note tone="warn">Ohne Bild erscheint kein Pop-up.</Note>}
        </div>
      </Section>

      <Section title="Wann und wo" description="Zeitraum, Häufigkeit und Seiten. Ohne Angaben erscheint es einmal pro Besuch auf allen Seiten.">
        <div className="flex flex-col gap-5">
          <FieldGrid>
            <Field label="Anzeigen ab" optional hint="Erster Tag. Leer: gleich nach dem Speichern.">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Anzeigen bis" optional hint="Letzter Tag, danach verschwindet es von selbst. Leer: bis du es ausschaltest.">
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </Field>
          </FieldGrid>
          {rangeInvalid && <Note tone="warn">Das Enddatum liegt vor dem Startdatum.</Note>}

          <FieldGrid>
            <Field
              label="Wie oft"
              hint={
                frequency === 'day' || frequency === 'week'
                  ? 'Merkt sich im Browser des Besuchers, wann das Bild zuletzt gezeigt wurde. Es wird nichts übermittelt.'
                  : 'Pro Besuch heißt: einmal, bis der Besucher den Browser schließt.'
              }
            >
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as PopupFrequency)}>
                {POPUP_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {POPUP_FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Verzögerung in Sekunden" hint="0 = sofort, höchstens 60.">
              <Input inputMode="numeric" value={delay} onChange={(e) => setDelay(e.target.value)} />
            </Field>
          </FieldGrid>
          {delayInvalid && <Note tone="warn">Bitte eine ganze Zahl von 0 bis {POPUP_MAX_DELAY} eintragen.</Note>}

          <Field label="Auf welchen Seiten">
            <Select value={pages} onChange={(e) => setPages(e.target.value as PopupPages)}>
              {POPUP_PAGES.map((p) => (
                <option key={p} value={p}>
                  {POPUP_PAGES_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          {pages === 'custom' && (
            <Field label="Seiten" hint="Eine Adresse pro Zeile, z. B. /angebote. Mit * am Ende gilt es auch für alles darunter, z. B. /aktionen/*.">
              <Textarea value={paths} onChange={(e) => setPaths(e.target.value)} rows={4} placeholder={'/\n/angebote'} />
            </Field>
          )}
          {pathsMissing && <Note tone="warn">Bitte mindestens eine Seite eintragen.</Note>}
        </div>
      </Section>

      <SaveBar start={<span className="text-[13px] text-[#64748B]">Änderungen sind nach dem Speichern sofort sichtbar.</span>}>
        <Button type="button" variant="ghost" onClick={reset} disabled={!dirty || saving}>
          Verwerfen
        </Button>
        <Button type="submit" variant="primary" disabled={saving || (enabled && !imageUrl) || rangeInvalid || delayInvalid || pathsMissing}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Speichern
        </Button>
      </SaveBar>
    </form>
  )
}
