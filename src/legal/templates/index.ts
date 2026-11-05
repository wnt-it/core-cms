// Vorlagen für Rechtstexte (zentral im Core, für alle Projekte). Siehe docs/RECHTSTEXTE.md.
export {
  buildDatenschutz,
  normalizeDatenschutzConfig,
  DATENSCHUTZ_TEMPLATE_VERSION,
  DATENSCHUTZ_TEMPLATE_CHANGES,
  DATENSCHUTZ_MODULE_LABELS,
  DEFAULT_DATENSCHUTZ_CONFIG,
} from "./datenschutz";
export type { DatenschutzConfig } from "./datenschutz";
export { getDatenschutzVorlage, getDatenschutzSicherungen } from "./vorlage";
export type { DatenschutzVorlageStand, DatenschutzSicherung } from "./vorlage";
export { saveDatenschutzVorlage, applyDatenschutzVorlage, restoreDatenschutzSicherung } from "./actions";
