// Quelle: template/src/lib/media-download.ts
import { toast } from 'sonner'

/**
 * Downloads a single media file directly as a Blob attachment
 */
export async function downloadSingleMedia(url: string, filename: string): Promise<boolean> {
  if (!url) return false

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up memory
    window.URL.revokeObjectURL(blobUrl)
    return true
  } catch (err) {
    console.error('Failed to download media file:', err)
    // Fallback: Open in new tab if CORS or fetch fails
    const fallbackLink = document.createElement('a')
    fallbackLink.href = url
    fallbackLink.target = '_blank'
    fallbackLink.rel = 'noopener noreferrer'
    fallbackLink.download = filename || 'download'
    document.body.appendChild(fallbackLink)
    fallbackLink.click()
    document.body.removeChild(fallbackLink)
    return false
  }
}

/**
 * Downloads multiple media files sequentially with feedback
 */
export async function downloadMultipleMedia(
  items: { url?: string; name?: string; isFolder?: boolean }[]
): Promise<void> {
  const filesToDownload = items.filter((i) => !i.isFolder && i.url)

  if (filesToDownload.length === 0) {
    toast.error('Keine herunterladbaren Dateien ausgewählt')
    return
  }

  const toastId = toast.loading(`${filesToDownload.length} Datei(en) werden heruntergeladen...`)
  let downloadedCount = 0

  for (const item of filesToDownload) {
    if (!item.url) continue
    const success = await downloadSingleMedia(item.url, item.name || 'download')
    if (success) downloadedCount++
    // Small non-blocking stagger to prevent browser popup block
    await new Promise((resolve) => setTimeout(resolve, 350))
  }

  toast.dismiss(toastId)
  if (downloadedCount > 0) {
    toast.success(`${downloadedCount} Datei(en) erfolgreich heruntergeladen`)
  } else {
    toast.error('Download fehlgeschlagen')
  }
}
