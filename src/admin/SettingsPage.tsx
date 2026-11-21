// Admin-Seite /admin/einstellungen (über coreAdminPages, ab v0.14.0). Holt Stammdaten und SMTP serverseitig,
// braucht keinen projekteigenen SiteSettingsContext. Tabs: Website & Branding, E-Mail & SMTP, Daten-Export.
// Hier stehen nur Core-Funktionen. Projektspezifisches (z. B. Kopfbilder) ist eine eigene Seite unter „Inhalte“.

import { createClient } from '../supabase/server'
import type { SiteSettings } from '../supabase/types'
import { PageHeader } from '../ui/components'
import { getSmtpSettings } from './settings-actions'
import SettingsTabs from './SettingsTabs'
import type { FormDefinition } from '../submissions/form'

export interface EinstellungenOptions {
  /** Website-Name, der gespeichert wird, wenn das Feld leer bleibt */
  defaultSiteName?: string
  /** false: Tab „Daten-Export“ ausblenden (Standard: sichtbar) */
  dataExport?: boolean
  /**
   * Alle Formulare des Projekts, damit sie unter „Empfänger je Formular“ schon vor ihrer ersten Anfrage stehen.
   * Am besten dieselben Definitionen, mit denen die Formulare senden (defineForm-Ergebnisse oder Formular-Arten
   * aus src/forms.ts), dann können Liste und gesendeter Name nicht auseinanderlaufen.
   * Ohne Angabe erscheint jedes Formular mit seiner ersten Anfrage.
   */
  forms?: Array<string | Pick<FormDefinition, 'type'>>
}

async function loadSiteSettings(): Promise<Partial<SiteSettings>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'general').maybeSingle()
  if (error) console.error('Failed to load site settings:', error)
  return (data as Partial<SiteSettings> | null) ?? {}
}

export default async function SettingsPage({ options = {} }: { options?: EinstellungenOptions }) {
  const [settings, smtp] = await Promise.all([loadSiteSettings(), getSmtpSettings()])
  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Website-Name, Logo, Favicon und Kontaktdaten, der E-Mail-Ausgang (SMTP) und der Daten-Export. Gilt für die ganze Website."
      />
      <SettingsTabs
        settings={settings}
        smtp={smtp}
        defaultSiteName={options.defaultSiteName}
        dataExport={options.dataExport !== false}
        forms={(options.forms ?? []).map((f) => (typeof f === 'string' ? f : f.type))}
      />
    </>
  )
}
