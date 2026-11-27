// Posteingang: Anfragen aus beliebigen Formularen mit beliebigen Feldern. Der Core gibt keine Pflichtfelder vor.
// Feste Felder (name/email/phone/company/subject/message) haben eigene Spalten, alles andere steht in metadata,
// die Bezeichnungen in field_labels. Neue Felder brauchen keine Datenbankänderung.
//
// Einstiege: server (receiveSubmission, Server Action des Projekts), client (FormGuard, sendForm),
// Admin-Seite „Posteingang“ kommt über coreAdminPages.

export * from "./types";
export * from "./submit-contact-form";
export { defineForm } from "./form";
export type { FormDefinition, FormField, AttachmentRules, AttachmentType, FormNotify } from "./form";
export { default as SubmissionsAdminClient } from "./SubmissionsAdminClient";
export { default as AdminSubmissionsPage } from "./AdminSubmissionsPage";
export type { AdminSubmissionsPageProps } from "./AdminSubmissionsPage";
