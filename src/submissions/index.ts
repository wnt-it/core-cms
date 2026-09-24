// Bleibt bewusst generisch: feste Felder (name/email/...) + offenes `metadata` für
// kundenindividuelle Formularfelder, siehe project_core_cms_migration Memory-Eintrag.
// Voraussetzung in Supabase: submissions.metadata bleibt jsonb, keine Migration pro Kundenfeld nötig.

export * from "./types";
export * from "./submit-contact-form";
export { default as SubmissionsAdminClient } from "./SubmissionsAdminClient";
export { default as AdminSubmissionsPage } from "./AdminSubmissionsPage";
export type { AdminSubmissionsPageProps } from "./AdminSubmissionsPage";
