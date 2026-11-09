'use client'

// Tabs der Core-Seite „Einstellungen“ (SettingsPage.tsx). Nach dem Speichern lädt router.refresh() den Stand neu.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteSettings } from '../supabase/types'
import { Segmented } from '../ui/components'
import { ExportPanel } from '../export'
import GeneralSettingsForm from './GeneralSettingsForm'
import SmtpSettingsForm from './SmtpSettingsForm'

export default function SettingsTabs({
  settings,
  smtp,
  defaultSiteName,
  dataExport,
}: {
  settings: Partial<SiteSettings>
  smtp: { host: string; port: string; user: string; pass: string; fromName: string; fromEmail: string; recipient: string }
  defaultSiteName?: string
  dataExport: boolean
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
      {active === 'smtp' && <SmtpSettingsForm initialSettings={smtp} />}
      {active === 'export' && dataExport && <ExportPanel />}
    </>
  )
}
