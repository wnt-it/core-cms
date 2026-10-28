'use client'

// Quelle: template/src/components/ui/MediaLibraryModal.tsx
// Imports auf core-cms-interne relative Pfade umgestellt.
// Wird aus AdminShell und aus Projektseiten geöffnet: Schrift, Farben und
// Akzent-Rückfallwerte deshalb hier selbst setzen, nichts vom Projekt-CSS erben.

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, UploadCloud, Trash2, Loader2, RefreshCw, FolderPlus, Pen, MoveRight, Search, Download } from 'lucide-react'
import PromptModal from './PromptModal'
import MoveModal from './MoveModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import { useMediaLibrary } from './useMediaLibrary'
import { MediaGrid } from './MediaGrid'
import { downloadMultipleMedia } from './media-download'
import type { ImageOptimizationOptions } from './image-prepare'
import { Button, Note } from '../ui/components'
import { cx, iconButtonClass, inputClass } from '../ui/styles'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | string[]) => void
  bucket?: string
  multiSelect?: boolean
  /** Bilder beim Upload verkleinern (Standard: an, 2000 px, WebP). */
  imageOptimization?: ImageOptimizationOptions
}

// Ordnerpfad: aktueller Ordner fett, Ablegeziel mit Akzent
const crumbClass = (active: boolean, dropHover: boolean) =>
  cx(
    'shrink-0 cursor-pointer rounded-md px-1.5 py-1 outline-none transition-colors focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
    dropHover
      ? 'bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_12%,white)] text-[#0F172A] ring-1 ring-[var(--admin-accent,#F18652)]'
      : active
        ? 'font-medium text-[#0F172A]'
        : 'text-[#64748B] hover:text-[#0F172A]'
  )

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  bucket = 'images',
  multiSelect = false,
  imageOptimization
}: MediaLibraryModalProps) {
  const {
    currentFolderId,
    folderBreadcrumbs,
    searchQuery,
    setSearchQuery,
    items,
    loading,
    uploading,
    syncing,
    selectedItems,
    error,
    setError,
    navigateTo,
    navigateToBreadcrumb,
    toggleSelection,
    handleUpload,
    confirmDelete,
    handleCreateFolder,
    handleRename,
    handleMove,
    moveItems,
    handleSync
  } = useMediaLibrary({ bucket, multiSelect, imageOptimization })

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Drag & Drop State & Refs
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const [hoveredBreadcrumbId, setHoveredBreadcrumbId] = useState<string | null>(null)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape schließt die Mediathek, solange kein Unterfenster offen ist
  const subModalOpen = isCreateFolderOpen || isRenameOpen || isMoveOpen || isDeleteOpen
  useEffect(() => {
    if (!isOpen || subModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, subModalOpen, onClose])

  // Fokus beim Öffnen ins Fenster
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
  }, [isOpen])

  const handleConfirmSelect = () => {
    if (selectedItems.length === 0) return

    const files = selectedItems.filter(i => !i.isFolder)
    if (files.length === 0) return

    if (multiSelect) {
      onSelect(files.map(i => i.url))
    } else {
      onSelect(files[0].url)
    }
    onClose()
  }

  const isSearchActive = searchQuery.trim().length > 0
  const selectedFileCount = selectedItems.filter(i => !i.isFolder).length

  // File Upload Drag & Drop Event Handlers (External files from desktop)
  const handleModalDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1
      setIsDraggingFiles(true)
    }
  }

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        setIsDraggingFiles(false)
        dragCounter.current = 0
      }
    }
  }

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFiles(false)
    dragCounter.current = 0

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  // Handle dropping images onto a folder card
  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setHoveredFolderId(null)

    try {
      const rawData = e.dataTransfer.getData('application/json')
      if (rawData) {
        const draggedItems = JSON.parse(rawData)
        if (Array.isArray(draggedItems) && draggedItems.length > 0) {
          moveItems(draggedItems, targetFolderId)
          return
        }
      }
    } catch (_) {}

    // Fallback: if native files were dropped on a folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  // Handle dropping images onto breadcrumbs (move to root or parent folder)
  const handleDropOnBreadcrumb = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setHoveredBreadcrumbId(null)

    try {
      const rawData = e.dataTransfer.getData('application/json')
      if (rawData) {
        const draggedItems = JSON.parse(rawData)
        if (Array.isArray(draggedItems) && draggedItems.length > 0) {
          moveItems(draggedItems, targetFolderId)
        }
      }
    } catch (_) {}
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased sm:p-6 lg:p-10 [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 cursor-pointer bg-[rgba(15,23,42,.4)]"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-library-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] as const }}
            className="relative z-10 flex h-dvh w-full max-w-[1200px] flex-col overflow-hidden bg-white outline-none shadow-[0_20px_50px_rgba(15,23,42,.15)] sm:h-full sm:max-h-[900px] sm:rounded-xl"
            onDragEnter={handleModalDragEnter}
            onDragLeave={handleModalDragLeave}
            onDragOver={handleModalDragOver}
            onDrop={handleModalDrop}
          >
            {/* Hidden Global File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files)
                }
              }}
              disabled={uploading}
            />

            {/* Global Active External Files Drag-and-Drop Overlay */}
            {isDraggingFiles && (
              <div className="pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--admin-accent,#F18652)] bg-white/95 text-center">
                <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_12%,white)] text-[color-mix(in_srgb,var(--admin-accent,#F18652)_80%,black)]">
                  <UploadCloud size={22} strokeWidth={1.75} />
                </span>
                <p className="text-[15px] font-medium text-[#0F172A]">Dateien jetzt hier ablegen</p>
                <p className="text-[13px] text-[#64748B]">
                  Upload erfolgt direkt {currentFolderId ? 'in den aktuellen Ordner' : 'in das Hauptverzeichnis'}
                </p>
              </div>
            )}

            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="media-library-title" className="text-[16px] font-semibold text-[#0F172A]">Mediathek</h2>
                <p className="mt-0.5 text-[13px] text-[#64748B]">
                  Bilder hochladen oder vorhandene Medien auswählen.
                </p>
              </div>
              <button type="button" onClick={onClose} className={cx(iconButtonClass, '-mr-2 -mt-1')} aria-label="Schließen">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-[#F1F5F9] px-4 py-3 sm:px-6">

              {/* Breadcrumbs */}
              {isSearchActive ? (
                <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#64748B] md:basis-0">
                  <span className="min-w-0 truncate">
                    Treffer für <strong className="font-medium text-[#0F172A]">„{searchQuery}“</strong> · {items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="cursor-pointer rounded text-[13px] font-medium text-[#334155] underline underline-offset-2 outline-none hover:text-[#0F172A] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]"
                  >
                    Suche zurücksetzen
                  </button>
                </div>
              ) : (
                <nav aria-label="Ordnerpfad" className="-mx-1.5 flex min-w-0 flex-1 basis-full items-center gap-0.5 overflow-x-auto px-0 text-[14px] md:basis-0">
                  <button
                    type="button"
                    onClick={() => navigateToBreadcrumb(null)}
                    onDragOver={(e) => { e.preventDefault(); setHoveredBreadcrumbId('root') }}
                    onDragLeave={() => setHoveredBreadcrumbId(null)}
                    onDrop={(e) => handleDropOnBreadcrumb(e, null)}
                    className={crumbClass(!currentFolderId, hoveredBreadcrumbId === 'root')}
                    aria-current={!currentFolderId ? 'location' : undefined}
                    title="Hier ablegen, um Bilder ins Hauptverzeichnis zu verschieben"
                  >
                    Alle Medien
                  </button>

                  {folderBreadcrumbs.map((crumb) => (
                    <span key={crumb.id} className="flex shrink-0 items-center gap-0.5">
                      <span aria-hidden="true" className="text-[#CBD5E1]">/</span>
                      <button
                        type="button"
                        onClick={() => navigateToBreadcrumb(crumb.id)}
                        onDragOver={(e) => { e.preventDefault(); setHoveredBreadcrumbId(crumb.id) }}
                        onDragLeave={() => setHoveredBreadcrumbId(null)}
                        onDrop={(e) => handleDropOnBreadcrumb(e, crumb.id)}
                        className={crumbClass(crumb.id === currentFolderId, hoveredBreadcrumbId === crumb.id)}
                        aria-current={crumb.id === currentFolderId ? 'location' : undefined}
                        title={`Hier ablegen, um Bilder in „${crumb.name}“ zu verschieben`}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </nav>
              )}

              {/* Right Action Tools */}
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap">
                {/* Live Search Input */}
                <span className="relative flex w-full sm:w-auto sm:flex-1 md:w-[240px] md:flex-none">
                  <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Bildname suchen"
                    aria-label="Bildname suchen"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cx(inputClass, 'h-9 pl-9 pr-8 focus:border-[var(--admin-accent,#F18652)] focus:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Suche leeren"
                      className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing || loading}
                  title="Cloud-Speicher scannen und neue Dateien automatisch registrieren"
                  aria-label={syncing ? 'Synchronisiere …' : 'Synchronisieren'}
                >
                  <RefreshCw size={15} strokeWidth={1.75} className={syncing ? 'animate-spin' : ''} />
                  <span className="hidden lg:inline">{syncing ? 'Synchronisiere …' : 'Synchronisieren'}</span>
                </Button>

                {!isSearchActive && (
                  <Button variant="secondary" size="sm" onClick={() => setIsCreateFolderOpen(true)}>
                    <FolderPlus size={15} strokeWidth={1.75} />
                    <span>Neuer Ordner</span>
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="ml-auto md:ml-0"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} strokeWidth={1.75} />}
                  <span>{uploading ? 'Lädt …' : 'Hochladen'}</span>
                </Button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
              {error && (
                <Note
                  tone="error"
                  action={
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="cursor-pointer text-[13px] font-medium underline underline-offset-2"
                    >
                      Ausblenden
                    </button>
                  }
                >
                  {error}
                </Note>
              )}

              <MediaGrid
                items={items}
                loading={loading}
                uploading={uploading}
                isSearchActive={isSearchActive}
                searchQuery={searchQuery}
                selectedItems={selectedItems}
                toggleSelection={toggleSelection}
                hoveredFolderId={hoveredFolderId}
                setHoveredFolderId={setHoveredFolderId}
                navigateTo={navigateTo}
                handleDropOnFolder={handleDropOnFolder}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* Stable Fixed Footer Bar */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-[#F1F5F9] bg-[#FAFAFC] px-4 py-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {selectedItems.length > 0 ? (
                  <>
                    <span className="mr-2 text-[13px] font-medium text-[#0F172A]" aria-live="polite">
                      {selectedItems.length} ausgewählt
                    </span>

                    {selectedItems.length === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setIsRenameOpen(true)}>
                        <Pen size={14} strokeWidth={1.75} />
                        <span>Umbenennen</span>
                      </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => setIsMoveOpen(true)}>
                      <MoveRight size={14} strokeWidth={1.75} />
                      <span>Verschieben</span>
                    </Button>

                    {selectedItems.some(i => !i.isFolder) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadMultipleMedia(selectedItems)}
                        title="Ausgewählte Dateien herunterladen"
                      >
                        <Download size={14} strokeWidth={1.75} />
                        <span>Herunterladen ({selectedFileCount})</span>
                      </Button>
                    )}

                    <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
                      <Trash2 size={14} strokeWidth={1.75} />
                      <span>Löschen</span>
                    </Button>
                  </>
                ) : (
                  <p className="hidden text-[13px] text-[#64748B] sm:block">
                    Bild anklicken zum Auswählen oder auf einen Ordner ziehen, um es zu verschieben.
                  </p>
                )}
              </div>

              {/* Right Action: Cancel & Select */}
              <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                <Button variant="ghost" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button variant="primary" onClick={handleConfirmSelect} disabled={selectedFileCount === 0}>
                  Auswahl übernehmen
                </Button>
              </div>
            </div>

          </motion.div>

          {/* Modals */}
          <PromptModal
            isOpen={isCreateFolderOpen}
            onClose={() => setIsCreateFolderOpen(false)}
            onConfirm={async (name) => {
              await handleCreateFolder(name)
              setIsCreateFolderOpen(false)
            }}
            title="Neuer Ordner"
            placeholder="Ordnername, z. B. kollektionen"
            confirmLabel="Anlegen"
          />

          <PromptModal
            isOpen={isRenameOpen}
            onClose={() => setIsRenameOpen(false)}
            onConfirm={async (name) => {
              await handleRename(name)
              setIsRenameOpen(false)
            }}
            title="Umbenennen"
            initialValue={selectedItems[0]?.name || ''}
          />

          <MoveModal
            isOpen={isMoveOpen}
            onClose={() => setIsMoveOpen(false)}
            onConfirm={handleMove}
            bucket={bucket}
            itemsCount={selectedItems.length}
          />

          <DeleteConfirmModal
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            onConfirm={() => {
              confirmDelete()
              setIsDeleteOpen(false)
            }}
            title="Elemente wirklich löschen?"
            description={`Möchten Sie die ausgewählten ${selectedItems.length} Element(e) wirklich dauerhaft löschen?`}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
