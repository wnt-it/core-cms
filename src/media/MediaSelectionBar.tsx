'use client'

// Fußleiste der Mediathek: Aktionen für die Auswahl (Umbenennen, Verschieben, Herunterladen, Löschen)
// sowie Abbrechen und „Auswahl übernehmen“.

import { Trash2, Pen, MoveRight, Download } from 'lucide-react'
import { Button } from '../ui/components'
import type { MediaItem } from './folder-tree'

interface MediaSelectionBarProps {
  selectedItems: MediaItem[]
  busy: boolean
  onRename: () => void
  onMove: () => void
  onDownload: () => void
  onDelete: () => void
  onCancel: () => void
  onConfirm: () => void
}

export default function MediaSelectionBar({ selectedItems, busy, onRename, onMove, onDownload, onDelete, onCancel, onConfirm }: MediaSelectionBarProps) {
  const fileCount = selectedItems.filter((i) => !i.isFolder).length

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-[#F1F5F9] bg-[#FAFAFC] px-4 py-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {selectedItems.length > 0 ? (
          <>
            <span className="mr-2 text-[13px] font-medium text-[#0F172A]" aria-live="polite">
              {selectedItems.length} ausgewählt
            </span>

            {selectedItems.length === 1 && (
              <Button variant="ghost" size="sm" onClick={onRename}>
                <Pen size={14} strokeWidth={1.75} />
                <span>Umbenennen</span>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={onMove}>
              <MoveRight size={14} strokeWidth={1.75} />
              <span>Verschieben</span>
            </Button>

            {fileCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onDownload} title="Ausgewählte Dateien herunterladen">
                <Download size={14} strokeWidth={1.75} />
                <span>Herunterladen ({fileCount})</span>
              </Button>
            )}

            <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
              <Trash2 size={14} strokeWidth={1.75} />
              <span>Löschen</span>
            </Button>
          </>
        ) : (
          <p className="hidden text-[13px] text-[#64748B] sm:block">Bild anklicken zum Auswählen oder auf einen Ordner ziehen, um es zu verschieben.</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={fileCount === 0}>
          Auswahl übernehmen
        </Button>
      </div>
    </div>
  )
}
