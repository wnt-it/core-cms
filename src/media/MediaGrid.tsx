'use client'

// Quelle: template/src/components/ui/media-library/MediaGrid.tsx
// Oben die Ordner als Zeilen, darunter die Dateien als Kacheln.

import React from 'react'
import { motion } from 'motion/react'
import { Folder, FolderInput, Loader2, UploadCloud } from 'lucide-react'
import { MediaItemCard } from './MediaItemCard'
import { cx } from '../ui/styles'

interface MediaGridProps {
  items: any[]
  loading: boolean
  uploading: boolean
  isSearchActive: boolean
  searchQuery: string
  selectedItems: any[]
  toggleSelection: (item: any) => void
  hoveredFolderId: string | null
  setHoveredFolderId: (id: string | null) => void
  navigateTo: (folderId: string) => void
  handleDropOnFolder: (e: React.DragEvent, id: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: [0.23, 1, 0.32, 1] as const
    }
  }
}

const filesGridClass = 'grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'

export function MediaGrid({
  items,
  loading,
  uploading,
  isSearchActive,
  searchQuery,
  selectedItems,
  toggleSelection,
  hoveredFolderId,
  setHoveredFolderId,
  navigateTo,
  handleDropOnFolder,
  fileInputRef
}: MediaGridProps) {
  if (loading) {
    // Platzhalter-Kacheln statt Drehkreis
    return (
      <div role="status" aria-label="Lade Medien …" className={filesGridClass}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5" aria-hidden="true">
            <div className="aspect-square animate-pulse rounded-lg bg-[#F1F5F9]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-[#F1F5F9]" />
          </div>
        ))}
        <span className="sr-only">Lade Medien …</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group flex h-full min-h-[300px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white p-8 text-center outline-none transition-colors hover:border-[#CBD5E1] hover:bg-[#FAFAFC] focus-visible:border-[var(--admin-accent,#F18652)] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] sm:p-12"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B] transition-colors group-hover:text-[#0F172A]">
          {uploading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <UploadCloud size={22} strokeWidth={1.75} />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-medium text-[#0F172A]">
            {uploading
              ? 'Dateien werden hochgeladen …'
              : isSearchActive
              ? `Keine Bilder für „${searchQuery}“ gefunden`
              : 'Dateien hierher ziehen'}
          </p>
          <p className="text-[13.5px] text-[#64748B]">
            {isSearchActive
              ? 'Versuchen Sie einen anderen Suchbegriff.'
              : 'oder klicken, um Bilder und Dokumente vom Computer auszuwählen'}
          </p>
          <p className="pt-1 text-[12.5px] text-[#94A3B8]">
            PNG, JPG, WEBP, SVG oder PDF · mehrere Dateien möglich
          </p>
        </div>
      </div>
    )
  }

  const folders = isSearchActive ? [] : items.filter((i) => i.isFolder)
  const files = items.filter((i) => !i.isFolder)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      key={isSearchActive ? searchQuery : 'grid-content'}
      className="flex flex-col gap-5"
    >
      {/* Folders first */}
      {folders.length > 0 && (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => {
            const isSelected = selectedItems.some((i) => i.id === folder.id)
            const isDropHovered = hoveredFolderId === folder.id

            return (
              <motion.div
                variants={itemVariants}
                key={folder.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Ordner ${folder.name}`}
                title="Doppelklick öffnet den Ordner"
                onDoubleClick={() => navigateTo(folder.id)}
                onClick={() => toggleSelection(folder)}
                onKeyDown={(e) => {
                  // Enter öffnet, Leertaste wählt aus
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    navigateTo(folder.id)
                  } else if (e.key === ' ') {
                    e.preventDefault()
                    toggleSelection(folder)
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setHoveredFolderId(folder.id)
                }}
                onDragLeave={(e) => {
                  e.stopPropagation()
                  if (hoveredFolderId === folder.id) setHoveredFolderId(null)
                }}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                className={cx(
                  'flex min-w-0 cursor-pointer select-none items-center gap-2.5 rounded-[10px] border px-3.5 py-3 text-[14px] font-medium outline-none transition-[border-color,background-color,box-shadow] duration-150 focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
                  isDropHovered
                    ? 'border-dashed border-[var(--admin-accent,#F18652)] bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_8%,white)]'
                    : isSelected
                    ? 'border-[var(--admin-accent,#F18652)] bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_6%,white)] shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFAFC]'
                )}
              >
                {isDropHovered ? (
                  <FolderInput size={18} strokeWidth={1.75} className="shrink-0 text-[color-mix(in_srgb,var(--admin-accent,#F18652)_85%,black)]" />
                ) : (
                  <Folder size={18} strokeWidth={1.75} className={cx('shrink-0', isSelected ? 'text-[color-mix(in_srgb,var(--admin-accent,#F18652)_85%,black)]' : 'text-[#64748B]')} />
                )}
                <span className="min-w-0 flex-1 truncate text-[#0F172A]" title={folder.name}>
                  {isDropHovered ? `In „${folder.name}“ ablegen` : folder.name}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className={filesGridClass}>
          {files.map((file) => {
            const isSelected = selectedItems.some((i) => i.id === file.id)
            return (
              <motion.div variants={itemVariants} key={file.id} className="min-w-0">
                <MediaItemCard
                  item={file}
                  isSelected={isSelected}
                  selectedItems={selectedItems}
                  toggleSelection={toggleSelection}
                />
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
