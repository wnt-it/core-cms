// Browser-Teil des Posteingangs (ab v0.15.0): Formular absenden, Anhänge direkt zu Supabase hochladen
// und prüfen lassen. Import im Projekt: `import { FormGuard, sendForm } from "core-cms/src/submissions/client"`.

import { createClient } from '../supabase/client'
import { confirmSubmissionFiles } from './files-actions'
import type { ReceiveResult } from './receive'

export { default as FormGuard } from './FormGuard'
export type { ReceiveResult, UploadTicket } from './receive'

export type SendFormResult =
  | { success: true; submissionId?: string; rejectedFiles: string[] }
  | { success: false; error: string; field?: string }

/**
 * Schickt ein Formular an die Server Action des Projekts (die receiveSubmission aufruft).
 * Dateien aus <input type="file"> gehen nicht über den Server der Website (Vercel nimmt nur ca. 4,5 MB
 * pro Anfrage), sondern nach der Prüfung direkt in den privaten Speicher. Danach prüft der Core den
 * echten Dateityp. Abgelehnte Dateien stehen in rejectedFiles.
 */
export async function sendForm(
  action: (data: Record<string, unknown>) => Promise<ReceiveResult>,
  source: HTMLFormElement | Record<string, unknown>,
  extraFiles: File[] = [],
): Promise<SendFormResult> {
  const data: Record<string, unknown> = {}
  const files: File[] = [...extraFiles]
  if (typeof HTMLFormElement !== 'undefined' && source instanceof HTMLFormElement) {
    const fd = new FormData(source)
    for (const key of new Set(fd.keys())) {
      const values: string[] = []
      for (const v of fd.getAll(key)) {
        if (typeof v === 'string') values.push(v)
        else if (v.size > 0) files.push(v)
      }
      if (values.length) data[key] = values.length === 1 ? values[0] : values
    }
  } else {
    Object.assign(data, source)
  }
  if (files.length) data.files = files.map((f) => ({ name: f.name, size: f.size, type: f.type }))

  const result = await action(data)
  if (!result.success) return result
  if (!result.uploads?.length || !result.submissionId) return { success: true, submissionId: result.submissionId, rejectedFiles: [] }

  const supabase = createClient()
  for (const [i, ticket] of result.uploads.entries()) {
    const file = files[i]
    if (!file) continue
    const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type })
    if (error) console.error('[sendForm] Upload fehlgeschlagen', error)
  }
  const confirmed = await confirmSubmissionFiles(result.submissionId)
  if (!confirmed.success) return { success: true, submissionId: result.submissionId, rejectedFiles: files.map((f) => f.name) }
  return { success: true, submissionId: result.submissionId, rejectedFiles: confirmed.rejected }
}
