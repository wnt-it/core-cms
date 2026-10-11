import { toast } from 'sonner'
import { prepareImage, type ImageOptimizationOptions } from './image-prepare'

/**
 * Bereitet Dateien für den Upload vor (Bilder verkleinern) und zeigt dabei
 * nicht blockierende Hinweise. Reihenfolge und Anzahl bleiben erhalten.
 */
export async function prepareFilesForUpload(files: File[], options?: ImageOptimizationOptions): Promise<File[]> {
  const result: File[] = []
  const undecodable: string[] = []
  let toastId: string | number | undefined

  for (const file of files) {
    if (options?.enabled !== false && toastId === undefined && file.type.startsWith('image/')) {
      toastId = toast.loading('Bild wird verkleinert …')
    }
    const prepared = await prepareImage(file, options)
    if (prepared.status === 'undecodable') undecodable.push(file.name)
    result.push(prepared.file)
  }

  if (toastId !== undefined) toast.dismiss(toastId)
  if (undecodable.length > 0) {
    toast.warning(
      `${undecodable.slice(0, 3).join(', ')}${undecodable.length > 3 ? ' …' : ''} konnte nicht verkleinert werden ` +
        'und wird im Original hochgeladen.'
    )
  }
  return result
}
