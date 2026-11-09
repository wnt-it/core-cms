'use client'

// Quelle: template/src/components/ui/media-library/MediaItemCard.tsx
// Kachel mit Bild, darunter Name und Größe (auch ohne Maus lesbar).

import React, { useState } from 'react'
import { Check, Download, FileText } from 'lucide-react'
import { downloadSingleMedia } from './media-download'
import { isImage, type MediaFileItem, type MediaItem } from './folder-tree'
import { cx } from '../ui/styles'
import { formatBytes } from '../ui/format'

/** Früher hier definiert, jetzt in ui/format.ts (einheitlich „1,5 MB“). */
export { formatBytes }

interface MediaItemCardProps {
  item: MediaFileItem
  isSelected: boolean
  selectedItems?: MediaItem[]
  toggleSelection: (item: MediaItem) => void
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
    const isPartOfSelection = selectedItems.some((i) => i.id === item.id)
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
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleSelection(item)
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={item.name}
      className="group flex min-w-0 cursor-grab select-none flex-col gap-1.5 rounded-lg outline-none active:cursor-grabbing focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]"
    >
      <div
        className={cx(
          'relative aspect-square overflow-hidden rounded-lg border bg-[#F1F5F9] transition-[border-color,box-shadow] duration-150',
          isSelected
            ? 'border-[var(--admin-accent,#F18652)] shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]'
            : 'border-[#E2E8F0] group-hover:border-[#CBD5E1]'
        )}
      >
        {/* Vorschau: Bilder erst laden, wenn sie in Sicht kommen; PDF und andere Dateien als Symbol */}
        {isImage(item) ? (
          <img
            src={item.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none h-full w-full object-cover"
            onLoad={(e) => {
              const target = e.currentTarget as HTMLImageElement
              setResolution(`${target.naturalWidth} × ${target.naturalHeight} px`)
            }}
          />
        ) : (
          <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-1 text-[#64748B]">
            <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
            <span className="text-[11px] font-medium uppercase">{item.name.split('.').pop()?.slice(0, 5) || 'Datei'}</span>
          </span>
        )}

        {/* Auswahl-Haken */}
        <span
          aria-hidden="true"
          className={cx(
            'absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-md transition-opacity',
            isSelected
              ? 'bg-[var(--admin-accent,#F18652)] text-white opacity-100'
              : 'border-[1.5px] border-white bg-[rgba(15,23,42,.25)] opacity-0 group-hover:opacity-100'
          )}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </span>

        {/* Schnell-Download oben rechts */}
        <button
          type="button"
          onClick={handleQuickDownload}
          disabled={isDownloading}
          title="Herunterladen"
          aria-label={`${item.name} herunterladen`}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-[#334155] opacity-0 shadow-[0_1px_2px_rgba(15,23,42,.12)] outline-none transition-opacity hover:text-[#0F172A] focus-visible:opacity-100 focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] group-hover:opacity-100 disabled:opacity-50 [@media(hover:none)]:opacity-100"
        >
          <Download size={14} className={isDownloading ? 'animate-bounce' : ''} />
        </button>

        {/* Ordner bei aktiver Suche */}
        {item.folderName && (
          <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-medium text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,.12)]">
            {item.folderName}
          </span>
        )}
      </div>

      {/* Name und Größe */}
      <div className="min-w-0 px-0.5">
        <p className="truncate text-[12.5px] text-[#334155]" title={item.name}>
          {item.name}
        </p>
        {(item.size || resolution) && (
          <p className="truncate text-[11.5px] text-[#94A3B8]">
            {item.size ? formatBytes(item.size) : null}
            {item.size && resolution ? ' · ' : null}
            {resolution}
          </p>
        )}
      </div>
    </div>
  )
}
