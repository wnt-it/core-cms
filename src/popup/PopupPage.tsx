// Admin-Seite /admin/popup (über coreAdminPages). Holt den Stand serverseitig.

import { Badge, PageHeader } from '../ui/components'
import PopupForm from './PopupForm'
import { getSitePopupSettings } from './get-site-popup'

export default async function PopupPage() {
  const settings = await getSitePopupSettings()
  return (
    <>
      <PageHeader
        title="Pop-up"
        description="Ein Bild als Hinweis beim Öffnen der Website, z. B. für Aktionen oder Betriebsferien."
        actions={settings.enabled && settings.imageUrl ? <Badge tone="green" dot>Eingeschaltet</Badge> : <Badge dot>Aus</Badge>}
      />
      <PopupForm initial={settings} />
    </>
  )
}
