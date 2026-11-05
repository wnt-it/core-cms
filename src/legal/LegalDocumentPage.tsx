// Admin-Seite zum Bearbeiten eines Rechtstextes (z. B. Datenschutzerklärung). Holt den Stand serverseitig.
// Das Projekt legt dafür eine eigene Route an und übergibt seine Vorlage, z. B.:
//   app/admin/(dashboard)/datenschutz/page.tsx
//   <LegalDocumentPage slug="datenschutz" label="Datenschutzerklärung" publicPath="/datenschutz" template={...} />

import { Badge, PageHeader } from '../ui/components'
import LegalDocumentForm from './LegalDocumentForm'
import { getLegalDocument } from './get-legal-document'
import type { LegalDocumentContent } from './policy'
import TemplatePanel from './templates/TemplatePanel'
import { buildDatenschutz, type DatenschutzConfig } from './templates/datenschutz'
import { getDatenschutzVorlage } from './templates/vorlage'

export default async function LegalDocumentPage({
  slug,
  label,
  description,
  publicPath,
  template,
  numbered = true,
  showVersion = true,
  vorlageDefaults,
}: {
  /** Nur Datenschutzerklärung: Startwerte der Vorlage-Einstellungen (Firma, Bausteine …), solange noch nichts gespeichert ist. */
  vorlageDefaults?: Partial<DatenschutzConfig>
  /** Kennung in der Datenbank, z. B. "datenschutz" (Kleinbuchstaben, Ziffern, Bindestrich). */
  slug: string
  /** Name für die Überschrift im Admin, z. B. "Datenschutzerklärung". */
  label: string
  description?: string
  /** Öffentliche Seite, z. B. "/datenschutz". */
  publicPath?: string
  /** Vorlage des Projekts: gilt, solange nichts gespeichert ist, und dient zum Zurücksetzen. */
  template?: LegalDocumentContent
  /** false: schlichter Text ohne Nummern, Inhaltsverzeichnis und Verweise (z. B. Impressum). Standard: true. */
  numbered?: boolean
  /** false: ohne Feld „Fassung“ (z. B. Impressum). Standard: true. */
  showVersion?: boolean
}) {
  // Datenschutzerklärung: Vorlage und Einstellungen kommen aus dem Core (legal/templates), sofern das Projekt keine eigene Vorlage übergibt
  const vorlage = slug === 'datenschutz' ? await getDatenschutzVorlage(vorlageDefaults) : null
  const effectiveTemplate = template ?? (vorlage ? buildDatenschutz(vorlage.config) : { title: label, version: '', blocks: [] })
  const doc = await getLegalDocument(slug, effectiveTemplate)
  return (
    <>
      <PageHeader
        title={label}
        description={description ?? 'Texte, Überschriften und Reihenfolge bearbeiten. Das Inhaltsverzeichnis entsteht automatisch.'}
        actions={doc.fromDatabase ? <Badge tone="green" dot>Gespeichert</Badge> : <Badge tone="amber" dot>Noch Vorlage</Badge>}
      />
      {vorlage && !template && (
        <TemplatePanel
          initial={vorlage.config}
          savedVersion={vorlage.version}
          appliedAt={vorlage.appliedAt}
          settingsSaved={vorlage.gespeichert}
          publicPath={publicPath}
        />
      )}
      <LegalDocumentForm
        slug={slug}
        initial={{ title: doc.title, version: doc.version, blocks: doc.blocks }}
        template={effectiveTemplate}
        publicPath={publicPath}
        fromDatabase={doc.fromDatabase}
        numbered={numbered}
        showVersion={showVersion}
      />
    </>
  )
}
