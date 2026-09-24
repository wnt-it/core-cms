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
import {
  Globe,
  Image as ImageIcon,
  Trash2,
  Save,
  Sparkles,
  Mail,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

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
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <h2 className="font-extrabold text-xl text-black flex items-center gap-2">
            <Globe className="text-primary" size={22} />
            <span>Website-Stammdaten & Branding</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Zentraler Name, Slogan, Logo, Favicon und globale Kontaktdaten.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-black/5">
          Live-Stammdaten
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-8 text-xs">

        {/* 1. BRANDING & IDENTITÄT */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-black border-b border-black/5 pb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <span>1. Markenauftritt & Name</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Websitename / Unternehmen *</label>
              <input
                type="text"
                required
                value={formData.site_name || ''}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                placeholder="z.B. Firmenname"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary font-semibold text-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Slogan / Untertitel</label>
              <input
                type="text"
                value={formData.site_tagline || ''}
                onChange={(e) => setFormData({ ...formData, site_tagline: e.target.value })}
                placeholder="z.B. exklusive mode & accessoires"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-neutral-700">Kurzbeschreibung (Meta-Description / Footer)</label>
            <textarea
              rows={3}
              value={formData.site_description || ''}
              onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
              placeholder="Allgemeine Beschreibung für Suchmaschinen und den Seitenfuß..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary leading-relaxed font-sans text-xs"
            />
          </div>
        </div>

        {/* 2. LOGO & FAVICON AUS MEDIATHEK */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-sm text-black border-b border-black/5 pb-2 flex items-center gap-2">
            <ImageIcon size={16} className="text-primary" />
            <span>2. Logo & Favicon</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Logo Picker */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-black">Hauptlogo (Header & Footer)</label>
                <button
                  type="button"
                  onClick={() => {
                    setMediaTarget('logo')
                    setMediaModalOpen(true)
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black font-bold rounded-xl border border-black/10 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} />
                  <span>Mediathek</span>
                </button>
              </div>

              {formData.logo_url ? (
                <div className="flex items-center gap-3">
                  <div className="h-16 w-32 bg-white rounded-xl border border-black/10 p-2 flex items-center justify-center shadow-xs">
                    <img src={formData.logo_url} alt="Logo Vorschau" className="max-h-full max-w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: null })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                    title="Logo entfernen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="h-16 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center text-neutral-400 text-[11px]">
                  Standard-Logo aktiv (Kein Bild hinterlegt)
                </div>
              )}
            </div>

            {/* Favicon Picker */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-black">Favicon (Browser-Tab Icon)</label>
                <button
                  type="button"
                  onClick={() => {
                    setMediaTarget('favicon')
                    setMediaModalOpen(true)
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black font-bold rounded-xl border border-black/10 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} />
                  <span>Mediathek</span>
                </button>
              </div>

              {formData.favicon_url ? (
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 bg-white rounded-xl border border-black/10 p-2 flex items-center justify-center shadow-xs">
                    <img src={formData.favicon_url} alt="Favicon Vorschau" className="w-8 h-8 object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, favicon_url: null })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                    title="Favicon entfernen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="h-16 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center text-neutral-400 text-[11px]">
                  Standard-Favicon aktiv
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. KONTAKT & STANDORT */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-sm text-black border-b border-black/5 pb-2 flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <span>3. Zentrale Kontakt- & Standortdaten</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Offizielle Kontakt-E-Mail</label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="info@domain.de"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Telefonnummer</label>
              <input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+49 (0) ..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Straße & Hausnummer</label>
              <input
                type="text"
                value={formData.address_street || ''}
                onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                placeholder="z.B. Hauptstraße 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700">Ort / Postleitzahl</label>
              <input
                type="text"
                value={formData.address_city || ''}
                onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                placeholder="z.B. Stadt"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 border-t border-black/5 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Stammdaten speichern</span>
          </button>
        </div>

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

    </div>
  )
}
