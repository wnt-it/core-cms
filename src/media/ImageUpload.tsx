'use client'

// Quelle: template/src/components/ui/ImageUpload.tsx
// Imports auf core-cms-interne relative Pfade umgestellt.

import { useState, useRef } from 'react'
import { createClient } from '../supabase/client'
import Image from 'next/image'
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react'
import MediaLibraryModal from './MediaLibraryModal'

interface ImageUploadProps {
  name?: string
  label?: string
  defaultValue?: string
  value?: string
  bucket?: string
  folder?: string
  onChange?: (url: string) => void
}

export default function ImageUpload({
  name,
  label,
  defaultValue = '',
  value,
  bucket = 'images',
  folder = 'uploads',
  onChange
}: ImageUploadProps) {
  const [internalUrl, setInternalUrl] = useState<string>(defaultValue)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const currentUrl = value !== undefined ? value : internalUrl

  const handleUrlChange = (newUrl: string) => {
    setInternalUrl(newUrl)
    if (onChange) {
      onChange(newUrl)
    }
  }

  const processFile = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      await supabase.from('media_files').insert({
        storage_path: filePath,
        display_name: file.name,
        mime_type: file.type,
        size: file.size,
        url: publicUrl,
        folder_id: null,
      })

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
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase">
            {label}
          </label>
          <span className="text-[11px] text-neutral-400">Max. 5 MB</span>
        </div>
      )}

      {name && (
        <input
          type="hidden"
          name={name}
          value={currentUrl}
        />
      )}

      {currentUrl ? (
        <div className="relative group rounded-2xl overflow-hidden border border-black/10 bg-neutral-50 shadow-sm aspect-video max-w-md flex items-center justify-center">
          <Image
            src={currentUrl}
            alt={label || "Hochgeladenes Bild"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="p-2.5 bg-white text-black hover:bg-neutral-100 rounded-xl font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ImageIcon size={14} />
              <span>Aus Mediathek</span>
            </button>
            <button
              type="button"
              onClick={() => handleUrlChange('')}
              className="p-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Bild entfernen"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-md">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200
              ${isDragging
                ? 'border-black bg-neutral-100 scale-[0.99]'
                : 'border-black/15 bg-white hover:bg-neutral-50/50 hover:border-black/30'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600 shadow-xs">
                {isUploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <UploadCloud size={20} />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-800">
                  {isUploading ? 'Wird hochgeladen...' : 'Klicken oder Bild hierher ziehen'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">PNG, JPG, WEBP, SVG</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-black/5"
          >
            <ImageIcon size={14} />
            <span>Aus Mediathek wählen</span>
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500 mt-1">{error}</p>
      )}

      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        bucket={bucket}
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
