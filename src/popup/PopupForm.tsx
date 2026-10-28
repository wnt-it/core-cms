'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import ImageUpload from '../media/ImageUpload'
import { Button, Card, Field, Input, Note, SaveBar, Section, SwitchRow } from '../ui/components'
import { savePopupSettings } from './actions'
import type { SitePopupSettings } from './get-site-popup'

export default function PopupForm({ initial, placement }: { initial: SitePopupSettings; placement?: string }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [imageUrl, setImageUrl] = useState(initial.imageUrl)
  const [alt, setAlt] = useState(initial.alt)
  const [saving, startSave] = useTransition()

  const dirty = enabled !== initial.enabled || imageUrl !== initial.imageUrl || alt !== initial.alt

  const reset = () => {
    setEnabled(initial.enabled)
    setImageUrl(initial.imageUrl)
    setAlt(initial.alt)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startSave(async () => {
      const res = await savePopupSettings({ enabled, imageUrl, alt })
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
        description={placement ?? 'Erscheint beim Öffnen der Website, pro Besuch einmal. Wo genau, legt die Website fest.'}
      >
        <div className="flex flex-col gap-5">
          <SwitchRow
            label="Pop-up anzeigen"
            hint={enabled ? 'Sichtbar für alle Besucher, sobald gespeichert.' : 'Aus. Besucher sehen kein Pop-up.'}
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
      <SaveBar start={<span className="text-[13px] text-[#64748B]">Änderungen sind nach dem Speichern sofort sichtbar.</span>}>
        <Button type="button" variant="ghost" onClick={reset} disabled={!dirty || saving}>
          Verwerfen
        </Button>
        <Button type="submit" variant="primary" disabled={saving || (enabled && !imageUrl)}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Speichern
        </Button>
      </SaveBar>
    </form>
  )
}
