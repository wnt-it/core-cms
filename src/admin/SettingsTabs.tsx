'use client'

// Tabs der Core-Seite „Einstellungen“ (SettingsPage.tsx). Nach dem Speichern lädt router.refresh() den Stand neu.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteSettings } from '../supabase/types'
import { Segmented } from '../ui/components'
import { ExportPanel } from '../export'
import GeneralSettingsForm from './GeneralSettingsForm'
import SmtpSettingsForm from './SmtpSettingsForm'
import type { SmtpSettingsData } from '../email/form-recipients'

export default function SettingsTabs({
  settings,
  smtp,
  defaultSiteName,
  dataExport,
  forms,
}: {
  settings: Partial<SiteSettings>
  smtp: SmtpSettingsData
  defaultSiteName?: string
  dataExport: boolean
  /** Formulare, die schon vor der ersten Anfrage unter „Empfänger je Formular“ stehen sollen */
  forms?: string[]
}) {
  const router = useRouter()
  const [active, setActive] = useState('general')

  const options = [
    { value: 'general', label: 'Website & Branding' },
    { value: 'smtp', label: 'E-Mail & SMTP' },
    ...(dataExport ? [{ value: 'export', label: 'Daten-Export' }] : []),
  ]

  return (
    <>
      <div>
        <Segmented label="Bereich der Einstellungen" value={active} onChange={setActive} options={options} />
      </div>
      {active === 'general' && <GeneralSettingsForm settings={settings} refreshSettings={() => router.refresh()} defaultSiteName={defaultSiteName} />}
      {active === 'smtp' && <SmtpSettingsForm initialSettings={smtp} declaredForms={forms} />}
      {active === 'export' && dataExport && <ExportPanel />}
    </>
  )
}
