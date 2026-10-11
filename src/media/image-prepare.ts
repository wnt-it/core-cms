// Bilder vor dem Upload im Browser verkleinern und als WebP speichern.
// Spart Speicher, Ladezeit und Vercel-Bildtransformationen.

export interface ImageOptimizationOptions {
  /** false = Bilder unverändert hochladen (Standard: true). */
  enabled?: boolean
  /** Längste Kante in Pixeln, es wird nie hochskaliert (Standard: 2000). */
  maxDimension?: number
  /** WebP-Qualität 0–1 (Standard: 0.82). */
  quality?: number
}

export const DEFAULT_IMAGE_UPLOAD_OPTIONS: Required<ImageOptimizationOptions> = {
  enabled: true,
  maxDimension: 2000,
  quality: 0.82,
}

/**
 * Cache-Control für Uploads in Supabase Storage (ein Jahr). Dateinamen sind
 * eindeutig und werden nie überschrieben (upsert: false), daher unveränderlich.
 */
export const STORAGE_CACHE_CONTROL = '31536000'

const OPTIMIZABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type PrepareStatus =
  /** Verkleinert bzw. neu kodiert, Ergebnis ist kleiner. */
  | 'optimized'
  /** Optimierbar, aber das Ergebnis wäre nicht kleiner – Original bleibt. */
  | 'unchanged'
  /** Kein optimierbares Bild (SVG, GIF, PDF …) oder Optimierung ausgeschaltet. */
  | 'skipped'
  /** Browser kann die Datei nicht dekodieren (z. B. HEIC) – Original bleibt. */
  | 'undecodable'

export interface PrepareResult {
  file: File
  status: PrepareStatus
}

function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf('.')
  return `${dot > 0 ? name.slice(0, dot) : name}.${ext}`
}

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, quality: number): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: 'image/webp', quality }).catch(() => null)
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
}

export async function prepareImage(file: File, options: ImageOptimizationOptions = {}): Promise<PrepareResult> {
  const { enabled, maxDimension, quality } = { ...DEFAULT_IMAGE_UPLOAD_OPTIONS, ...options }
  if (!enabled || !OPTIMIZABLE_TYPES.includes(file.type) || typeof createImageBitmap === 'undefined') {
    return { file, status: 'skipped' }
  }

  let bitmap: ImageBitmap
  try {
    // 'from-image': EXIF-Ausrichtung (Handy-Hochformat) wird beim Dekodieren angewendet
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return { file, status: 'undecodable' }
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height })
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!ctx) return { file, status: 'unchanged' }
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, quality)
    // Kein WebP-Encoder (z. B. ältere Safari liefern PNG) oder nicht kleiner: Original behalten
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) {
      return { file, status: 'unchanged' }
    }

    const optimized = new File([blob], replaceExtension(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
    return { file: optimized, status: 'optimized' }
  } finally {
    bitmap.close()
  }
}

/** Wie prepareImage, gibt aber nur die (ggf. verkleinerte) Datei zurück. */
export async function prepareImageForUpload(file: File, options: ImageOptimizationOptions = {}): Promise<File> {
  return (await prepareImage(file, options)).file
}
