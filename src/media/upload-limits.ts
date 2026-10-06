import { formatBytes } from './MediaItemCard'

/** Ab dieser Größe wird vor dem Hochladen gewarnt (große Bilder verlangsamen die Website). */
export const LARGE_FILE_WARN_BYTES = 5 * 1024 * 1024

/**
 * Fragt nach, ob große Dateien trotzdem hochgeladen werden sollen.
 * Gibt true zurück, wenn alle Dateien klein genug sind oder der Nutzer bestätigt.
 */
export function confirmLargeFiles(files: File[]): boolean {
  const large = files.filter((f) => f.size > LARGE_FILE_WARN_BYTES)
  if (large.length === 0) return true
  const list = large.slice(0, 5).map((f) => `• ${f.name} (${formatBytes(f.size)})`).join('\n')
  const more = large.length > 5 ? `\n… und ${large.length - 5} weitere` : ''
  return window.confirm(
    `Diese Datei(en) sind größer als ${formatBytes(LARGE_FILE_WARN_BYTES, 0)}:\n\n${list}${more}\n\n` +
      'Große Bilder machen die Website langsamer. Bitte vorher verkleinern oder komprimieren.\n\nTrotzdem hochladen?'
  )
}
