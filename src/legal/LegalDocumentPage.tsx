// Admin-Seite zum Bearbeiten eines Rechtstextes (z. B. Datenschutzerklärung). Holt den Stand serverseitig.
// Das Projekt legt dafür eine eigene Route an und übergibt seine Vorlage, z. B.:
//   app/admin/(dashboard)/datenschutz/page.tsx
//   <LegalDocumentPage slug="datenschutz" label="Datenschutzerklärung" publicPath="/datenschutz" template={...} />

import { Badge, PageHeader } from '../ui/components'
import LegalDocumentForm from './LegalDocumentForm'
import { getLegalDocument } from './get-legal-document'
import type { LegalDocumentContent } from './policy'

export default async function LegalDocumentPage({
  slug,
  label,
  description,
  publicPath,
  template,
  numbered = true,
  showVersion = true,
}: {
  /** Kennung in der Datenbank, z. B. "datenschutz" (Kleinbuchstaben, Ziffern, Bindestrich). */
  slug: string
  /** Name für die Überschrift im Admin, z. B. "Datenschutzerklärung". */
  label: string
  description?: string
  /** Öffentliche Seite, z. B. "/datenschutz". */
  publicPath?: string
  /** Vorlage des Projekts: gilt, solange nichts gespeichert ist, und dient zum Zurücksetzen. */
  template: LegalDocumentContent
  /** false: schlichter Text ohne Nummern, Inhaltsverzeichnis und Verweise (z. B. Impressum). Standard: true. */
  numbered?: boolean
  /** false: ohne Feld „Fassung“ (z. B. Impressum). Standard: true. */
  showVersion?: boolean
}) {
  const doc = await getLegalDocument(slug, template)
  return (
    <>
      <PageHeader
        title={label}
        description={description ?? 'Texte, Überschriften und Reihenfolge bearbeiten. Das Inhaltsverzeichnis entsteht automatisch.'}
        actions={doc.fromDatabase ? <Badge tone="green" dot>Gespeichert</Badge> : <Badge tone="amber" dot>Noch Vorlage</Badge>}
      />
      <LegalDocumentForm
        slug={slug}
        initial={{ title: doc.title, version: doc.version, blocks: doc.blocks }}
        template={template}
        publicPath={publicPath}
        fromDatabase={doc.fromDatabase}
        numbered={numbered}
        showVersion={showVersion}
      />
    </>
  )
}
