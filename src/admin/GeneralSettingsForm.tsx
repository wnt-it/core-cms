'use client'

// Quelle: template/src/components/admin/GeneralSettingsForm.tsx
//
// Abweichung vom Original: das Original bezog `settings`/`refreshSettings` aus einem
// projekt-lokalen React Context (`@/contexts/SiteSettingsContext`), der pro Kundenprojekt
// existiert und NICHT Teil des core-cms-Packages ist (core-cms darf keine `@/`-Aliase
// verwenden und kennt keinen projektspezifischen Context). Diese Version bekommt
// `settings` und `refreshSettings` daher als Props injiziert - der aufrufende Code im
// jeweiligen Kundenprojekt bindet weiterhin seinen eigenen SiteSettingsContext an.

import { useState, useEffect } from 'react'
import { SiteSettings } from '../supabase/types'
import MediaLibraryModal from '../media/MediaLibraryModal'
import { saveGeneralSettings } from './settings-actions'
import { Image as ImageIcon, Trash2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Field, FieldGrid, Input, SaveBar, Section, Textarea, cx, hintClass, iconButtonDangerClass } from '../ui'

export interface GeneralSettingsFormProps {
  settings: Partial<SiteSettings> | null | undefined
  refreshSettings: () => void | Promise<void>
  defaultSiteName?: string
}

export default function GeneralSettingsForm({ settings, refreshSettings, defaultSiteName = '' }: GeneralSettingsFormProps) {
  const [formData, setFormData] = useState<Partial<SiteSettings>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon' | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        site_name: formData.site_name || defaultSiteName,
        site_tagline: formData.site_tagline || '',
        site_description: formData.site_description || '',
        logo_url: formData.logo_url || null,
        favicon_url: formData.favicon_url || null,
        contact_email: formData.contact_email || '',
        contact_phone: formData.contact_phone || null,
        address_street: formData.address_street || null,
        address_city: formData.address_city || '',
      }

      const res = await saveGeneralSettings(payload)
      if (!res.success) throw new Error(res.error || 'Fehler beim Speichern.')

      await refreshSettings()
      toast.success('Website-Stammdaten & Branding erfolgreich gespeichert!')
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error('Fehler beim Speichern der Einstellungen: ' + (err.message || 'Verbindungsfehler'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleMediaSelect = (urls: string | string[]) => {
    const chosenUrl = Array.isArray(urls) ? urls[0] : urls
    if (!chosenUrl) return

    if (mediaTarget === 'logo') {
      setFormData((prev) => ({ ...prev, logo_url: chosenUrl }))
    } else if (mediaTarget === 'favicon') {
      setFormData((prev) => ({ ...prev, favicon_url: chosenUrl }))
    }
    setMediaModalOpen(false)
    setMediaTarget(null)
  }

  return (
    <>
      <form onSubmit={handleSave} className="flex flex-col">
        <Section
          title="Markenauftritt & Name"
          description="Name und Beschreibung erscheinen im Browser-Tab, in Suchergebnissen und im Fußbereich."
        >
          <FieldGrid>
            <Field label="Websitename / Unternehmen">
              <Input
                type="text"
                required
                value={formData.site_name || ''}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                placeholder="z.B. Firmenname"
              />
            </Field>
            <Field label="Slogan / Untertitel" optional>
              <Input
                type="text"
                value={formData.site_tagline || ''}
                onChange={(e) => setFormData({ ...formData, site_tagline: e.target.value })}
                placeholder="z.B. exklusive mode & accessoires"
              />
            </Field>
          </FieldGrid>
          <Field label="Kurzbeschreibung" hint="Für Suchmaschinen (Meta-Description) und den Seitenfuß. Ein bis zwei Sätze.">
            <Textarea
              rows={3}
              value={formData.site_description || ''}
              onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
              placeholder="Allgemeine Beschreibung für Suchmaschinen und den Seitenfuß..."
            />
          </Field>
        </Section>

        <Section title="Logo & Favicon" description="Bilder kommen aus der Mediathek." bare>
          <Card padded={false}>
            <ImageRow
              title="Hauptlogo"
              hint="Kopf- und Fußbereich (Header & Footer)."
              emptyText="Standard-Logo aktiv (kein Bild hinterlegt)"
              url={formData.logo_url}
              previewAlt="Logo Vorschau"
              previewClass="max-h-full max-w-full object-contain"
              removeLabel="Logo entfernen"
              onPick={() => {
                setMediaTarget('logo')
                setMediaModalOpen(true)
              }}
              onRemove={() => setFormData({ ...formData, logo_url: null })}
            />
            <ImageRow
              title="Favicon"
              hint="Symbol im Browser-Tab."
              emptyText="Standard-Favicon aktiv"
              url={formData.favicon_url}
              previewAlt="Favicon Vorschau"
              previewClass="h-8 w-8 object-contain"
              removeLabel="Favicon entfernen"
              onPick={() => {
                setMediaTarget('favicon')
                setMediaModalOpen(true)
              }}
              onRemove={() => setFormData({ ...formData, favicon_url: null })}
              divider
            />
          </Card>
        </Section>

        <Section
          title="Kontakt & Standort"
          description="Zentrale Kontaktdaten, z. B. für Impressum, Fußbereich und Suchmaschinen."
        >
          <FieldGrid>
            <Field label="Kontakt-E-Mail">
              <Input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="info@domain.de"
              />
            </Field>
            <Field label="Telefonnummer">
              <Input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+49 (0) ..."
              />
            </Field>
            <Field label="Straße & Hausnummer">
              <Input
                type="text"
                value={formData.address_street || ''}
                onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                placeholder="z.B. Hauptstraße 1"
              />
            </Field>
            <Field label="PLZ & Ort">
              <Input
                type="text"
                value={formData.address_city || ''}
                onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                placeholder="z.B. Stadt"
              />
            </Field>
          </FieldGrid>
        </Section>

        <SaveBar start={<p className={hintClass}>Änderungen sind nach dem Speichern sofort auf der Website sichtbar.</p>}>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Stammdaten speichern</span>
          </Button>
        </SaveBar>
      </form>

      {/* Mediathek Modal */}
      {mediaModalOpen && (
        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => {
            setMediaModalOpen(false)
            setMediaTarget(null)
          }}
          onSelect={handleMediaSelect}
          multiSelect={false}
        />
      )}
    </>
  )
}

// Eine Bildzeile (Vorschau, Text, Auswählen/Entfernen) im Abschnitt Logo & Favicon.
function ImageRow({
  title,
  hint,
  emptyText,
  url,
  previewAlt,
  previewClass,
  removeLabel,
  onPick,
  onRemove,
  divider = false,
}: {
  title: string
  hint: string
  emptyText: string
  url: string | null | undefined
  previewAlt: string
  previewClass: string
  removeLabel: string
  onPick: () => void
  onRemove: () => void
  divider?: boolean
}) {
  return (
    <div className={cx('flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6', divider && 'border-t border-[#F1F5F9]')}>
      <div
        className={cx(
          'flex h-16 w-[120px] flex-none items-center justify-center rounded-[10px] bg-[#FAFAFC] p-2',
          url ? 'border border-[#E2E8F0]' : 'border border-dashed border-[#CBD5E1] text-[#94A3B8]'
        )}
      >
        {url ? <img src={url} alt={previewAlt} className={previewClass} /> : <ImageIcon size={20} aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-[1_1_200px]">
        <p className="text-[14px] font-medium text-[#0F172A]">{title}</p>
        <p className={hintClass}>{url ? hint : emptyText}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={onPick}>
          <ImageIcon size={14} aria-hidden="true" />
          <span>{url ? 'Ersetzen' : 'Mediathek'}</span>
        </Button>
        {url && (
          <button type="button" onClick={onRemove} className={iconButtonDangerClass} aria-label={removeLabel} title={removeLabel}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
