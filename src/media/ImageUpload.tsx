'use client'

// Quelle: template/src/components/ui/ImageUpload.tsx
// Imports auf core-cms-interne relative Pfade umgestellt.
// Bildfeld: leer = Ablagefläche, gefüllt = Vorschau mit Ersetzen/Entfernen.

import { useState, useRef, useId } from 'react'
import { createClient } from '../supabase/client'
import Image from 'next/image'
import { UploadCloud, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react'
import MediaLibraryModal from './MediaLibraryModal'
import { confirmLargeFiles } from './upload-limits'
import type { ImageOptimizationOptions } from './image-prepare'
import { uploadToLibrary } from './upload-to-library'
import { prepareFilesForUpload } from './prepare-uploads'
import { Button } from '../ui/components'
import { cx, iconButtonDangerClass, labelClass } from '../ui/styles'

interface ImageUploadProps {
  name?: string
  label?: string
  defaultValue?: string
  value?: string
  bucket?: string
  folder?: string
  onChange?: (url: string) => void
  /** Bilder beim Upload verkleinern (Standard: an, 2000 px, WebP). */
  imageOptimization?: ImageOptimizationOptions
}

// Dateiname aus der Adresse, nur zur Anzeige
function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || '')
  } catch {
    return url.split('/').pop() || ''
  }
}

export default function ImageUpload({
  name,
  label,
  defaultValue = '',
  value,
  bucket = 'images',
  folder = 'uploads',
  onChange,
  imageOptimization
}: ImageUploadProps) {
  const [internalUrl, setInternalUrl] = useState<string>(defaultValue)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()

  const supabase = createClient()
  const currentUrl = value !== undefined ? value : internalUrl

  const handleUrlChange = (newUrl: string) => {
    setInternalUrl(newUrl)
    if (onChange) {
      onChange(newUrl)
    }
  }

  const processFile = async (original: File) => {
    setIsUploading(true)
    setError(null)

    try {
      // Bild zuerst verkleinern; nur große Restdateien (PDF, SVG, GIF …) fragen nach
      const [file] = await prepareFilesForUpload([original], imageOptimization)
      if (!confirmLargeFiles([file])) return

      const publicUrl = await uploadToLibrary(supabase, file, { bucket, folder })

      handleUrlChange(publicUrl)
    } catch (err: any) {
      console.error('Upload Error:', err)
      setError(err.message || 'Fehler beim Hochladen')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      await processFile(file)
    } else {
      setError('Bitte nur Bilddateien ablegen.')
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={label ? labelId : undefined}
      className="flex w-full flex-col gap-1.5 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A]"
    >
      {label && (
        <span id={labelId} className={labelClass}>
          {label}
        </span>
      )}

      {name && (
        <input
          type="hidden"
          name={name}
          value={currentUrl}
        />
      )}

      {currentUrl ? (
        <div className="flex max-w-md flex-col overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white">
          <div className="relative aspect-video bg-[#F1F5F9]">
            <Image
              src={currentUrl}
              alt={label || "Hochgeladenes Bild"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          </div>
          <div className="flex items-center gap-2 border-t border-[#F1F5F9] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#64748B]" title={fileNameFromUrl(currentUrl)}>
              {fileNameFromUrl(currentUrl)}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setIsLibraryOpen(true)}>
              <ImageIcon size={14} strokeWidth={1.75} />
              <span>Ersetzen</span>
            </Button>
            <button
              type="button"
              onClick={() => handleUrlChange('')}
              className={cx(iconButtonDangerClass, 'h-8 w-8')}
              title="Bild entfernen"
              aria-label="Bild entfernen"
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex max-w-md flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
            aria-busy={isUploading}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed px-4 py-5 text-center outline-none transition-colors duration-150 focus-visible:border-[var(--admin-accent,#F18652)] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
              isDragging
                ? 'border-[var(--admin-accent,#F18652)] bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_8%,white)]'
                : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFAFC]'
            )}
          >
            <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#64748B]">
              {isUploading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <UploadCloud size={18} strokeWidth={1.75} />
              )}
            </span>
            <b className="text-[14px] font-medium text-[#0F172A]">
              {isUploading ? 'Wird hochgeladen …' : 'Bild hierher ziehen oder klicken'}
            </b>
            <span className="text-[12.5px] text-[#64748B]">PNG, JPG, WEBP oder SVG · höchstens 5 MB</span>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setIsLibraryOpen(true)} className="w-full">
            <ImageIcon size={14} strokeWidth={1.75} />
            <span>Aus Mediathek wählen</span>
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] text-[#B91C1C]">{error}</p>
      )}

      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        bucket={bucket}
        imageOptimization={imageOptimization}
        onSelect={(url) => {
          if (typeof url === 'string') {
            handleUrlChange(url)
          } else if (Array.isArray(url) && url.length > 0) {
            handleUrlChange(url[0])
          }
        }}
      />
    </div>
  )
}
