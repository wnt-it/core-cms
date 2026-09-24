'use client'

// Quelle: template/src/components/ui/media-library/MediaItemCard.tsx
import React, { useState } from 'react'
import { Check, Download } from 'lucide-react'
import { downloadSingleMedia } from './media-download'

export function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

interface MediaItemCardProps {
  item: any
  isSelected: boolean
  selectedItems?: any[]
  toggleSelection: (item: any) => void
}

export function MediaItemCard({
  item,
  isSelected,
  selectedItems = [],
  toggleSelection
}: MediaItemCardProps) {
  const [resolution, setResolution] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    const isPartOfSelection = selectedItems.some((i: any) => i.id === item.id)
    const itemsToDrag = isPartOfSelection && selectedItems.length > 1
      ? selectedItems
      : [item]

    e.dataTransfer.setData('application/json', JSON.stringify(itemsToDrag))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDownloading(true)
    await downloadSingleMedia(item.url, item.name)
    setIsDownloading(false)
  }

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => toggleSelection(item)}
      className={`relative aspect-square border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing group select-none transition-all ${
        isSelected
          ? 'border-primary ring-2 ring-primary/30 ring-inset bg-neutral-100'
          : 'border-black/10 hover:border-black/30 bg-white'
      }`}
    >
      {/* Selection Checkmark */}
      <div
        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-opacity ${
          isSelected
            ? 'bg-primary border-primary text-white opacity-100'
            : 'border-white/90 bg-black/30 text-white opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check size={13} strokeWidth={3} />}
      </div>

      {/* Quick Download Action (Top Right on hover) */}
      <button
        type="button"
        onClick={handleQuickDownload}
        disabled={isDownloading}
        title="Herunterladen"
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 cursor-pointer shadow-sm disabled:opacity-50"
      >
        <Download size={12} className={isDownloading ? 'animate-bounce' : ''} />
      </button>

      {/* Folder Badge if search active */}
      {item.folderName && (
        <div className="absolute top-2 right-9 z-10 bg-black/70 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[90px]">
          {item.folderName}
        </div>
      )}

      {/* Image Preview */}
      <div className="absolute inset-0 bg-neutral-100">
        <img
          src={item.url}
          alt={item.name}
          className="w-full h-full object-cover pointer-events-none"
          onLoad={(e) => {
            const target = e.currentTarget as HTMLImageElement
            setResolution(`${target.naturalWidth} × ${target.naturalHeight} px`)
          }}
        />
      </div>

      {/* Bottom Metadata Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate font-medium" title={item.name}>
          {item.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-white/75">
          {item.size && <span>{formatBytes(item.size)}</span>}
          {item.size && resolution && <span className="opacity-50">•</span>}
          {resolution && <span>{resolution}</span>}
        </div>
      </div>
    </div>
  )
}
