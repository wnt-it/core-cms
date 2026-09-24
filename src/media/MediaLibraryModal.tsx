'use client'

// Quelle: template/src/components/ui/MediaLibraryModal.tsx
// Imports auf core-cms-interne relative Pfade umgestellt.

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Folder, FileImage, UploadCloud, Trash, Loader2, ChevronRight, RefreshCw, AlertCircle, FolderPlus, Pen, MoveRight, Search, Download } from 'lucide-react'
import PromptModal from './PromptModal'
import MoveModal from './MoveModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import { useMediaLibrary } from './useMediaLibrary'
import { MediaGrid } from './MediaGrid'
import { downloadMultipleMedia } from './media-download'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | string[]) => void
  bucket?: string
  multiSelect?: boolean
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  bucket = 'images',
  multiSelect = false
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
  } = useMediaLibrary({ bucket, multiSelect })

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] as const }}
            className="relative z-10 bg-white rounded-2xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl border border-black/10 overflow-hidden font-sans"
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
              <div className="absolute inset-4 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md border-2 border-dashed border-primary rounded-2xl shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <UploadCloud size={36} />
                </div>
                <p className="text-lg font-extrabold text-black">Dateien jetzt hier ablegen</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Upload erfolgt direkt {currentFolderId ? 'in den aktuellen Ordner' : 'in das Hauptverzeichnis'}
                </p>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-neutral-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <FileImage size={22} className="text-neutral-700" />
                  <span>Mediathek & Medienverwaltung</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Laden Sie Bilder hoch oder wählen Sie bestehende Medien aus.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-black rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-black/10 bg-white text-sm shrink-0">

              {/* Breadcrumbs */}
              {isSearchActive ? (
                <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
                  <Search size={15} className="text-neutral-400" />
                  <span>Suchergebnisse für: <strong className="text-black">"{searchQuery}"</strong> ({items.length} Treffer)</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-semibold text-neutral-500 hover:text-black underline ml-2 cursor-pointer"
                  >
                    Suche zurücksetzen
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-sm font-medium text-neutral-600">
                  <button
                    onClick={() => navigateToBreadcrumb(null)}
                    onDragOver={(e) => { e.preventDefault(); setHoveredBreadcrumbId('root') }}
                    onDragLeave={() => setHoveredBreadcrumbId(null)}
                    onDrop={(e) => handleDropOnBreadcrumb(e, null)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      hoveredBreadcrumbId === 'root'
                        ? 'bg-emerald-100 text-emerald-900 font-bold ring-1 ring-emerald-400'
                        : !currentFolderId
                          ? 'font-bold text-black bg-neutral-100'
                          : 'hover:text-black hover:bg-neutral-50'
                    }`}
                    title="Hier ablegen, um Bilder ins Startverzeichnis zu verschieben"
                  >
                    Startverzeichnis
                  </button>

                  {folderBreadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-1.5 shrink-0">
                      <ChevronRight size={14} className="text-neutral-400" />
                      <button
                        onClick={() => navigateToBreadcrumb(crumb.id)}
                        onDragOver={(e) => { e.preventDefault(); setHoveredBreadcrumbId(crumb.id) }}
                        onDragLeave={() => setHoveredBreadcrumbId(null)}
                        onDrop={(e) => handleDropOnBreadcrumb(e, crumb.id)}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          hoveredBreadcrumbId === crumb.id
                            ? 'bg-emerald-100 text-emerald-900 font-bold ring-1 ring-emerald-400'
                            : crumb.id === currentFolderId
                              ? 'font-bold text-black bg-neutral-100'
                              : 'hover:text-black hover:bg-neutral-50'
                        }`}
                        title={`Hier ablegen, um Bilder in "${crumb.name}" zu verschieben`}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Right Action Tools */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Live Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Bildname suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-black/15 bg-neutral-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 w-44 sm:w-56 transition-all font-medium"
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSync}
                  disabled={syncing || loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  title="Cloud-Speicher scannen und neue Dateien automatisch registrieren"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{syncing ? 'Synchronisiere...' : 'Cloud Sync'}</span>
                </button>

                {!isSearchActive && (
                  <button
                    onClick={() => setIsCreateFolderOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <FolderPlus size={13} />
                    <span>Neuer Ordner</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  <span>{uploading ? 'Lädt...' : 'Hochladen'}</span>
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-neutral-50/30">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="font-bold underline cursor-pointer">Ausblenden</button>
                </div>
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
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-black/10 bg-white shrink-0 min-h-[64px]">
              <div className="flex items-center gap-3">
                {selectedItems.length > 0 ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-black bg-neutral-100 px-2.5 py-1 rounded-lg">
                      {selectedItems.length} ausgewählt
                    </span>

                    {selectedItems.length === 1 && (
                      <button
                        onClick={() => setIsRenameOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pen size={12} />
                        <span>Umbenennen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsMoveOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <MoveRight size={12} />
                      <span>Verschieben</span>
                    </button>

                    {selectedItems.some(i => !i.isFolder) && (
                      <button
                        type="button"
                        onClick={() => downloadMultipleMedia(selectedItems)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Ausgewählte Dateien herunterladen"
                      >
                        <Download size={12} />
                        <span>Herunterladen ({selectedItems.filter(i => !i.isFolder).length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDeleteOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Löschen</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <span>💡 Klicke ein Bild an oder ziehe es per Drag & Drop auf einen Ordner</span>
                  </div>
                )}
              </div>

              {/* Right Action: Cancel & Select */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelect}
                  disabled={selectedItems.filter(i => !i.isFolder).length === 0}
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  Auswahl übernehmen
                </button>
              </div>
            </div>

          </motion.div>

          {/* Modals */}
          <PromptModal
            isOpen={isCreateFolderOpen}
            onClose={() => setIsCreateFolderOpen(false)}
            onConfirm={handleCreateFolder}
            title="Neuen Ordner erstellen"
            placeholder="Ordnername (z.B. kollektionen)"
          />

          <PromptModal
            isOpen={isRenameOpen}
            onClose={() => setIsRenameOpen(false)}
            onConfirm={handleRename}
            title="Element umbenennen"
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
