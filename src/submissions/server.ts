// Server-Teil des Posteingangs (ab v0.15.0). In einer Server Action des Projekts:
//
//   "use server";
//   import { receiveSubmission } from "core-cms/src/submissions/server";
//   import { kontaktFormular } from "@/forms";
//   export async function sendeKontakt(data: Record<string, unknown>) {
//     return receiveSubmission(kontaktFormular, data);
//   }

export { receiveSubmission, ATTACHMENT_BUCKET } from "./receive";
export type { ReceiveResult, UploadTicket } from "./receive";
export { submitContactForm } from "./submit-contact-form";
export type { SubmitContactFormOptions } from "./submit-contact-form";
export { defineForm } from "./form";
export type { FormDefinition, FormField, AttachmentRules, AttachmentType, FormNotify } from "./form";
