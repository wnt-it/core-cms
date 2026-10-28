'use client'

// Bildfeld für mehrere Bilder (z. B. ein Produkt mit Galerie). Das erste Bild ist
// das Hauptbild. Sortieren per Ziehen oder mit den Pfeilen, hinzufügen per Ablegen,
// Dateiauswahl oder aus der Mediathek. Optional `name`: schreibt die Adressen als
// JSON-Liste in ein verstecktes Feld, damit Server Actions sie per FormData lesen.

import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImagePlus, Images, Loader2, X } from 'lucide-react'
import { createClient } from '../supabase/client'
import MediaLibraryModal from './MediaLibraryModal'
import { confirmLargeFiles } from './upload-limits'
import type { ImageOptimizationOptions } from './image-prepare'
import { prepareFilesForUpload } from './prepare-uploads'
import { uploadToLibrary } from './upload-to-library'
import { Button, Note } from '../ui/components'
import { cx, hintClass, labelClass } from '../ui/styles'

export interface GalleryFieldProps {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  hint?: string
  /** Name des versteckten Felds (JSON-Liste der Adressen). */
  name?: string
  bucket?: string
  folder?: string
  /** Höchstens so viele Bilder (Standard: unbegrenzt). */
  max?: number
  imageOptimization?: ImageOptimizationOptions
}

const tileBtn =
  'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,.15)] outline-none transition-colors hover:bg-white hover:text-[#0F172A] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] disabled:opacity-40'

export default function GalleryField({
  value,
  onChange,
  label,
  hint,
  name,
  bucket = 'images',
  folder = 'uploads',
  max,
  imageOptimization,
}: GalleryFieldProps) {
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()
  // Aktuelle Liste auch während laufender Uploads (onChange-Aufrufe nacheinander)
  const latest = useRef(value)
  latest.current = value

  const free = max ? Math.max(0, max - value.length) : Infinity
  const full = free <= 0

  const add = (urls: string[]) => {
    const merged = [...latest.current, ...urls.filter((u) => u && !latest.current.includes(u))]
    const next = max ? merged.slice(0, max) : merged
    latest.current = next
    onChange(next)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const uploadFiles = async (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith('image/')).slice(0, free === Infinity ? undefined : free)
    if (images.length === 0) return
    setError(null)
    setUploading((n) => n + images.length)
    try {
      // Bilder zuerst verkleinern; nur große Restdateien fragen nach
      const prepared = await prepareFilesForUpload(images, imageOptimization)
      if (!confirmLargeFiles(prepared)) return
      const supabase = createClient()
      for (const file of prepared) {
        try {
          add([await uploadToLibrary(supabase, file, { bucket, folder })])
        } catch (err: any) {
          console.error('Upload Error:', err)
          setError(err.message || 'Fehler beim Hochladen')
        }
      }
    } finally {
      setUploading((n) => n - images.length)
    }
  }

  const onDropZone = (e: React.DragEvent) => {
    e.preventDefault()
    setDropActive(false)
    if (dragIndex !== null) return
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <span id={labelId} className={labelClass}>{label}</span>
          <span className={hintClass}>
            {value.length === 1 ? '1 Bild' : `${value.length} Bilder`}
            {max ? ` von ${max}` : ''}
          </span>
        </div>
      )}
      {name && <input type="hidden" name={name} value={JSON.stringify(value)} />}

      <ul aria-labelledby={label ? labelId : undefined} className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {value.map((url, i) => (
          <li
            key={url}
            draggable
            onDragStart={(e) => {
              setDragIndex(i)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
              if (dragIndex !== i) {
                move(dragIndex, i)
                setDragIndex(i)
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cx(
              'group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] active:cursor-grabbing',
              dragIndex === i && 'opacity-50 ring-2 ring-[var(--admin-accent,#F18652)]',
            )}
          >
            <Image src={url} alt="" fill sizes="(max-width: 640px) 45vw, 220px" className="pointer-events-none object-cover" />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[11.5px] font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,.15)]">
                Hauptbild
              </span>
            )}
            <button type="button" className={cx(tileBtn, 'absolute right-2 top-2 hover:text-[#B91C1C]')} onClick={() => remove(i)} aria-label={`Bild ${i + 1} entfernen`} title="Entfernen">
              <X size={14} strokeWidth={2} />
            </button>
            {/* Pfeile: auf Touch-Geräten immer sichtbar, sonst beim Darüberfahren */}
            {value.length > 1 && (
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                <button type="button" className={tileBtn} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Bild ${i + 1} nach vorne`}>
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
                <button type="button" className={tileBtn} onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label={`Bild ${i + 1} nach hinten`}>
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            )}
          </li>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <li key={`up-${i}`} className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FAFAFC] text-[12.5px] text-[#64748B]" role="status">
            <Loader2 size={18} className="animate-spin text-[var(--admin-accent,#F18652)]" />
            Wird hochgeladen …
          </li>
        ))}

        {!full && (
          <li>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                if (dragIndex !== null) return
                e.preventDefault()
                setDropActive(true)
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDropZone}
              className={cx(
                'flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center outline-none transition-colors focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
                dropActive
                  ? 'border-[var(--admin-accent,#F18652)] bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_8%,white)]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#FAFAFC]',
              )}
            >
              <ImagePlus size={18} strokeWidth={1.75} className="text-[#64748B]" />
              <span className="text-[13px] font-medium text-[#0F172A]">Bilder hinzufügen</span>
              <span className="text-[12px] text-[#64748B]">hierher ziehen oder klicken</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          uploadFiles(Array.from(e.target.files || []))
          e.target.value = ''
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={() => setLibraryOpen(true)} disabled={full}>
          <Images size={15} strokeWidth={1.75} />
          Aus Mediathek wählen
        </Button>
        {(hint || value.length > 1) && (
          <span className={hintClass}>{hint ?? 'Ziehen zum Sortieren, das erste Bild ist das Hauptbild.'}</span>
        )}
      </div>

      {error && <Note tone="error">{error}</Note>}

      <MediaLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(urls) => {
          add(Array.isArray(urls) ? urls : [urls])
          setLibraryOpen(false)
        }}
        bucket={bucket}
        multiSelect
        imageOptimization={imageOptimization}
      />
    </div>
  )
}
