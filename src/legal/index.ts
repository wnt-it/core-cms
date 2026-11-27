// Rechtstexte (ab v0.12.0): Datenschutzerklärung u. Ä. im Admin bearbeiten.
// Daten in legal_documents (slug, title, version, blocks), Migration: sql/0.12.0_legal_documents.sql.
// Das Projekt legt eine Admin-Route mit LegalDocumentPage an und liest den Text auf der Website mit getLegalDocument.

export { default as LegalDocumentPage } from "./LegalDocumentPage";
export { default as ImpressumPage } from "./ImpressumPage";
export { LegalRoute, renderLegalPage, generateLegalMetadata, generateLegalStaticParams, LEGAL_PUBLIC_PAGES } from "./LegalRoute";
export type { LegalPublicPage, LegalRouteOptions } from "./LegalRoute";
export { getImpressum } from "./get-impressum";
export type { ImpressumDocument } from "./get-impressum";
export { saveImpressum } from "./impressum-actions";
export { IMPRESSUM_SLUG, IMPRESSUM_SECTIONS, impressumToBlocks, missingImpressumFields, normalizeImpressum, DDG_5_URL } from "./impressum";
export type { ImpressumData, ImpressumField, ImpressumSection } from "./impressum";
export { getLegalDocument } from "./get-legal-document";
export { saveLegalDocument } from "./actions";
export {
  countPlaceholders,
  groupPolicyBlocks,
  policyAnchor,
  policyToc,
  renumberPolicyBlocks,
  policyNumbers,
  stripHeadingNumber,
  countNumberReferences,
  countBrokenRefs,
  refTargets,
  resolvePolicyRefs,
  resolvePolicyText,
  PLACEHOLDER_SOURCE,
} from "./policy";
export type { LegalDocument, LegalDocumentContent, PolicyBlock, PolicyBlockType, PolicyGroup } from "./policy";
export * from "./templates";
