// Admin-Seite zum Bearbeiten des Impressums als Formular (Pflichtangaben nach § 5 DDG). Holt den Stand serverseitig.
// Das Projekt legt dafür eine eigene Route an und übergibt seine vorbereiteten Angaben, z. B.:
//   app/admin/(dashboard)/impressum/page.tsx
//   <ImpressumPage slug="impressum" publicPath="/impressum" template={{ anbieter: { na: false, v: { name: "…" } } }} />

import { Badge, PageHeader } from '../ui/components'
import ImpressumForm from './ImpressumForm'
import { getImpressum } from './get-impressum'
import { normalizeImpressum } from './impressum'

export default async function ImpressumPage({
  slug = 'impressum',
  label = 'Impressum',
  description,
  publicPath,
  template,
}: {
  /** Kennung in der Datenbank, Standard „impressum“. */
  slug?: string
  label?: string
  description?: string
  /** Öffentliche Seite, z. B. "/impressum". */
  publicPath?: string
  /** Vorbereitete Angaben des Projekts (je Abschnitt { na, v: { feld: wert } }), gelten bis zum ersten Speichern. Fehlendes wird leer ergänzt. */
  template?: unknown
}) {
  const doc = await getImpressum(slug, template)
  return (
    <>
      <PageHeader
        title={label}
        description={description ?? 'Pflichtangaben nach § 5 DDG ausfüllen. Abschnitte, die nicht zutreffen, als „Nicht anwendbar“ markieren.'}
        actions={doc.fromDatabase ? <Badge tone="green" dot>Gespeichert</Badge> : <Badge tone="amber" dot>Noch Vorlage</Badge>}
      />
      <ImpressumForm slug={slug} initial={doc.data} template={normalizeImpressum(template)} publicPath={publicPath} fromDatabase={doc.fromDatabase} />
    </>
  )
}
