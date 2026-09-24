'use client'

// Quelle: template/src/components/ui/media-library/MediaGrid.tsx
import React from 'react'
import { motion } from 'motion/react'
import { Folder, FolderInput, Loader2, UploadCloud } from 'lucide-react'
import { MediaItemCard } from './MediaItemCard'

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
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400 min-h-[300px]">
        <Loader2 size={32} className="animate-spin text-neutral-600" />
        <span className="text-sm font-medium">Lade Medien...</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        className="h-full min-h-[300px] flex flex-col items-center justify-center text-neutral-400 gap-3 border-2 border-dashed border-neutral-300 hover:border-black/50 hover:bg-neutral-100/50 rounded-2xl p-8 sm:p-12 transition-colors cursor-pointer group"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 group-hover:bg-white flex items-center justify-center text-neutral-400 group-hover:text-black border border-neutral-200/80 shadow-sm transition-colors">
          {uploading ? (
            <Loader2 size={32} className="animate-spin text-black" />
          ) : (
            <UploadCloud size={32} className="text-neutral-500 group-hover:text-black transition-colors" />
          )}
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-base text-neutral-800 group-hover:text-black transition-colors">
            {uploading
              ? 'Dateien werden hochgeladen...'
              : isSearchActive
              ? `Keine Bilder für "${searchQuery}" gefunden`
              : 'Dateien per Drag & Drop hierher ziehen'}
          </p>
          <p className="text-xs text-neutral-500">
            {isSearchActive
              ? 'Versuche einen anderen Suchbegriff.'
              : 'oder klicken, um Bilder & Dokumente vom Computer auszuwählen'}
          </p>
          <p className="text-[11px] text-neutral-400 pt-1">
            Unterstützt PNG, JPG, WEBP, SVG & PDF (Mehrfachauswahl möglich)
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      key={isSearchActive ? searchQuery : 'grid-content'}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      {/* Folders first */}
      {!isSearchActive &&
        items
          .filter((i) => i.isFolder)
          .map((folder) => {
            const isSelected = selectedItems.some((i) => i.id === folder.id)
            const isDropHovered = hoveredFolderId === folder.id

            return (
              <motion.div
                variants={itemVariants}
                key={folder.id}
                onDoubleClick={() => navigateTo(folder.id)}
                onClick={() => toggleSelection(folder)}
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
                className={`flex flex-col items-center justify-center p-4 border rounded-xl bg-white cursor-pointer group select-none transition-colors ${
                  isDropHovered
                    ? 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/40'
                    : isSelected
                    ? 'border-primary ring-2 ring-primary/30 ring-inset bg-neutral-50'
                    : 'border-black/10 hover:border-black/30'
                }`}
              >
                {isDropHovered ? (
                  <FolderInput size={40} className="text-emerald-600" />
                ) : (
                  <Folder size={40} className="text-amber-400 fill-amber-400/20" />
                )}
                <span
                  className={`text-xs font-semibold mt-2 truncate w-full text-center ${
                    isDropHovered ? 'text-emerald-900 font-bold' : 'text-neutral-800'
                  }`}
                  title={folder.name}
                >
                  {isDropHovered ? `In "${folder.name}" ablegen` : folder.name}
                </span>
              </motion.div>
            )
          })}

      {/* Files */}
      {items
        .filter((i) => !i.isFolder)
        .map((file) => {
          const isSelected = selectedItems.some((i) => i.id === file.id)
          return (
            <motion.div variants={itemVariants} key={file.id}>
              <MediaItemCard
                item={file}
                isSelected={isSelected}
                selectedItems={selectedItems}
                toggleSelection={toggleSelection}
              />
            </motion.div>
          )
        })}
    </motion.div>
  )
}
