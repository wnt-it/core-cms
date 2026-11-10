'use client'

// Mediathek als Fenster. Lädt erst, wenn es geöffnet wird (vorher lud jede Admin-Seite die Medien im Hintergrund).
// Wird aus AdminShell und aus Projektseiten geöffnet: Schrift, Farben und
// Akzent-Rückfallwerte deshalb hier selbst setzen, nichts vom Projekt-CSS erben.
// Aufbau: Zustand und Aktionen in useMediaLibrary, oben MediaToolbar, Mitte MediaGrid, unten MediaSelectionBar.

import { useState, useRef, useEffect, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, UploadCloud } from 'lucide-react'
import PromptModal from './PromptModal'
import MoveModal from './MoveModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import { useMediaLibrary } from './useMediaLibrary'
import { MediaGrid } from './MediaGrid'
import MediaToolbar from './MediaToolbar'
import MediaSelectionBar from './MediaSelectionBar'
import { StorageUsage } from './StorageUsage'
import { downloadMultipleMedia } from './media-download'
import type { ImageOptimizationOptions } from './image-prepare'
import type { MediaFileItem, MediaItem } from './folder-tree'
import { Note } from '../ui/components'
import { cx, iconButtonClass } from '../ui/styles'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | string[]) => void
  bucket?: string
  multiSelect?: boolean
  /** Bilder beim Upload verkleinern (Standard: an, 2000 px, WebP). */
  imageOptimization?: ImageOptimizationOptions
}

/** Text der Rückfrage: Bei Ordnern auch, dass Unterordner und Dateien darin mit gelöscht werden. */
function deleteDescription({ folders, subfolders, files }: { folders: number; subfolders: number; files: number }) {
  if (!folders) return `Möchtest du ${files === 1 ? 'die ausgewählte Datei' : `die ${files} ausgewählten Dateien`} wirklich dauerhaft löschen?`
  // „folders“ zählt die Unterordner mit; genannt werden die ausgewählten Ordner, die Unterordner extra
  const selected = folders - subfolders
  const was = [files && (files === 1 ? '1 Datei' : `${files} Dateien`), selected === 1 ? '1 Ordner' : `${selected} Ordner`].filter(Boolean).join(' und ')
  const inside = subfolders ? `mit ${subfolders === 1 ? '1 Unterordner' : `${subfolders} Unterordnern`} und allen Dateien darin` : 'mit allen Dateien darin'
  return `${was} ${files + selected === 1 ? 'wird' : 'werden'} dauerhaft gelöscht, ${inside}. Das lässt sich nicht rückgängig machen.`
}

function deleteTitle({ folders, subfolders, files }: { folders: number; subfolders: number; files: number }) {
  const count = folders - subfolders + files
  if (count !== 1) return `${count} Elemente wirklich löschen?`
  return files ? 'Datei wirklich löschen?' : 'Ordner wirklich löschen?'
}

/** Elemente der Mediathek, die per Ziehen mitgegeben wurden (MediaItemCard setzt sie), sonst null */
function draggedItems(e: DragEvent): MediaItem[] | null {
  try {
    const raw = e.dataTransfer.getData('application/json')
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as MediaItem[]) : null
  } catch {
    return null
  }
}

const stop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

export default function MediaLibraryModal({ isOpen, onClose, onSelect, bucket = 'images', multiSelect = false, imageOptimization }: MediaLibraryModalProps) {
  const lib = useMediaLibrary({ bucket, multiSelect, imageOptimization, enabled: isOpen })
  const { selectedItems, items, currentFolderId, activeSearch, uploading, busy, loading } = lib

  // Speicheranzeige nur nach Änderungen am Speicher neu laden (nicht bei Ordnerwechsel oder Suche)
  const [storageRefresh, setStorageRefresh] = useState(0)
  const refreshStorage = () => setStorageRefresh((n) => n + 1)
  const uploadAndRefresh = (files: FileList) => void Promise.resolve(lib.handleUpload(files)).finally(refreshStorage)

  const [dialog, setDialog] = useState<null | 'create' | 'rename' | 'move' | 'delete'>(null)
  const closeDialog = () => setDialog(null)

  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape schließt die Mediathek, solange kein Unterfenster offen ist
  useEffect(() => {
    if (!isOpen || dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, dialog, onClose])

  // Fokus beim Öffnen ins Fenster
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
  }, [isOpen])

  const handleConfirmSelect = () => {
    const files = selectedItems.filter((i): i is MediaFileItem => !i.isFolder)
    if (files.length === 0) return
    onSelect(multiSelect ? files.map((i) => i.url) : files[0].url)
    onClose()
  }

  // Dateien vom Rechner ins Fenster ziehen (der Zähler verhindert Flackern über Kind-Elementen)
  const onDragEnter = (e: DragEvent) => {
    stop(e)
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current += 1
    setIsDraggingFiles(true)
  }
  const onDragLeave = (e: DragEvent) => {
    stop(e)
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDraggingFiles(false)
      dragCounter.current = 0
    }
  }
  const onDrop = (e: DragEvent) => {
    stop(e)
    setIsDraggingFiles(false)
    dragCounter.current = 0
    if (e.dataTransfer.files?.length) uploadAndRefresh(e.dataTransfer.files)
  }

  // Auf einen Ordner gezogen: Elemente der Mediathek verschieben, Dateien vom Rechner hochladen
  const handleDropOnFolder = (e: DragEvent, targetFolderId: string) => {
    stop(e)
    setHoveredFolderId(null)
    const dragged = draggedItems(e)
    if (dragged) void lib.moveItems(dragged, targetFolderId)
    else if (e.dataTransfer.files?.length) uploadAndRefresh(e.dataTransfer.files)
  }

  // Auf den Ordnerpfad gezogen: in diesen Ordner (oder ins Hauptverzeichnis) verschieben
  const handleDropOnCrumb = (e: DragEvent, targetFolderId: string | null) => {
    stop(e)
    const dragged = draggedItems(e)
    if (dragged) void lib.moveItems(dragged, targetFolderId)
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
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={stop}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files?.length) uploadAndRefresh(e.target.files)
              }}
              disabled={uploading}
            />

            {/* Hinweis beim Ziehen von Dateien vom Rechner */}
            {isDraggingFiles && (
              <div className="pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--admin-accent,#F18652)] bg-white/95 text-center">
                <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_12%,white)] text-[color-mix(in_srgb,var(--admin-accent,#F18652)_80%,black)]">
                  <UploadCloud size={22} strokeWidth={1.75} />
                </span>
                <p className="text-[15px] font-medium text-[#0F172A]">Dateien jetzt hier ablegen</p>
                <p className="text-[13px] text-[#64748B]">Upload erfolgt direkt {currentFolderId ? 'in den aktuellen Ordner' : 'in das Hauptverzeichnis'}</p>
              </div>
            )}

            {/* Kopf */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="media-library-title" className="text-[16px] font-semibold text-[#0F172A]">
                  Mediathek
                </h2>
                <p className="mt-0.5 text-[13px] text-[#64748B]">
                  Bilder hochladen oder vorhandene Medien auswählen. Alle Dateien hier sind öffentlich abrufbar, bitte keine vertraulichen Unterlagen hochladen.
                </p>
              </div>
              <StorageUsage refreshKey={storageRefresh} className="ml-auto" />
              <button type="button" onClick={onClose} className={cx(iconButtonClass, '-mr-2 -mt-1')} aria-label="Schließen">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <MediaToolbar
              currentFolderId={currentFolderId}
              breadcrumbs={lib.folderBreadcrumbs}
              searchQuery={lib.searchQuery}
              activeSearch={activeSearch}
              resultCount={items.length}
              onSearch={lib.setSearchQuery}
              onNavigate={lib.navigateTo}
              onDropOnCrumb={handleDropOnCrumb}
              onSync={() => void Promise.resolve(lib.handleSync()).finally(refreshStorage)}
              onCreateFolder={() => setDialog('create')}
              onUploadClick={() => fileInputRef.current?.click()}
              syncing={lib.syncing}
              uploading={uploading}
              locked={loading || busy}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
              {lib.error && (
                <Note
                  tone="error"
                  action={
                    <button type="button" onClick={() => lib.setError(null)} className="cursor-pointer text-[13px] font-medium underline underline-offset-2">
                      Ausblenden
                    </button>
                  }
                >
                  {lib.error}
                </Note>
              )}

              <MediaGrid
                items={items}
                loading={loading}
                uploading={uploading}
                isSearchActive={activeSearch.trim().length > 0}
                searchQuery={activeSearch}
                selectedItems={selectedItems}
                toggleSelection={lib.toggleSelection}
                hoveredFolderId={hoveredFolderId}
                setHoveredFolderId={setHoveredFolderId}
                navigateTo={lib.navigateTo}
                handleDropOnFolder={handleDropOnFolder}
                fileInputRef={fileInputRef}
              />
            </div>

            <MediaSelectionBar
              selectedItems={selectedItems}
              busy={busy}
              onRename={() => setDialog('rename')}
              onMove={() => setDialog('move')}
              onDownload={() => downloadMultipleMedia(selectedItems)}
              onDelete={() => setDialog('delete')}
              onCancel={onClose}
              onConfirm={handleConfirmSelect}
            />
          </motion.div>

          <PromptModal
            isOpen={dialog === 'create'}
            onClose={closeDialog}
            onConfirm={async (name) => {
              await lib.handleCreateFolder(name)
              closeDialog()
            }}
            title="Neuer Ordner"
            placeholder="Ordnername, z. B. kollektionen"
            confirmLabel="Anlegen"
          />

          <PromptModal
            isOpen={dialog === 'rename'}
            onClose={closeDialog}
            onConfirm={async (name) => {
              await lib.handleRename(name)
              closeDialog()
            }}
            title="Umbenennen"
            initialValue={selectedItems[0]?.name || ''}
          />

          <MoveModal
            isOpen={dialog === 'move'}
            onClose={closeDialog}
            onConfirm={async (destination) => {
              // Fenster schließt nach dem Verschieben (früher blieb es offen und wirkte hängend)
              if (await lib.handleMove(destination)) closeDialog()
            }}
            itemsCount={selectedItems.length}
            isLoading={busy}
            excludeFolderIds={selectedItems.filter((i) => i.isFolder).map((i) => i.id)}
          />

          <DeleteConfirmModal
            isOpen={dialog === 'delete'}
            onClose={closeDialog}
            onConfirm={() => {
              void Promise.resolve(lib.confirmDelete()).finally(refreshStorage)
              closeDialog()
            }}
            title={deleteTitle(lib.deletePreview())}
            description={deleteDescription(lib.deletePreview())}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
