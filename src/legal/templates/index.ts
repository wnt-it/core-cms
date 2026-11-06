// Vorlagen für Rechtstexte (zentral im Core, für alle Projekte). Siehe docs/RECHTSTEXTE.md.
export {
  buildDatenschutz,
  normalizeDatenschutzConfig,
  DATENSCHUTZ_TEMPLATE_VERSION,
  DATENSCHUTZ_TEMPLATE_CHANGES,
  DATENSCHUTZ_STANDARD_BAUSTEINE,
  DEFAULT_DATENSCHUTZ_CONFIG,
} from "./datenschutz";
export type { DatenschutzConfig } from "./datenschutz";
export { AUFSICHTSBEHOERDEN, BUNDESLAENDER, aufsichtText } from "./aufsichtsbehoerden";
export type { Aufsichtsbehoerde } from "./aufsichtsbehoerden";
export { getDatenschutzVorlage, getDatenschutzSicherungen } from "./vorlage";
export type { DatenschutzVorlageStand, DatenschutzSicherung } from "./vorlage";
export { BUNDLED_VORLAGE } from "./datenschutz";
export { parseVorlageText, compareVorlageVersion } from "./vorlage-text";
export type { DatenschutzVorlageText } from "./vorlage-text";
export { getDatenschutzVorlageText, VORLAGE_URL } from "./vorlage-remote";
export { mergeDatenschutz, vorschauDatenschutz, wordDiff } from "./merge";
export type { VorlageAenderung, VorlageVorschau, WordDiffPart } from "./merge";
export { saveDatenschutzVorlage, previewDatenschutzVorlage, applyDatenschutzVorlage, restoreDatenschutzSicherung } from "./actions";
