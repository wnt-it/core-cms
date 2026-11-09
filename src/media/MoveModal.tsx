'use client'

// Zielordner wählen. Die verschobenen Ordner selbst und ihre Unterordner stehen nicht zur Auswahl
// (ein Ordner kann nicht in sich selbst liegen). Pfade sind gegen Kreise in alten Daten geschützt.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Folder, Loader2 } from 'lucide-react'
import { createClient } from '../supabase/client'
import { folderPath, withDescendants, type MediaFolderRow } from './folder-tree'
import { Button } from '../ui/components'
import { cx } from '../ui/styles'

interface MoveModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (destinationPath: string) => void
  /** Nicht mehr genutzt, bleibt für bestehende Aufrufe */
  bucket?: string
  itemsCount: number
  isLoading?: boolean
  /** Ordner, die verschoben werden: sie und ihre Unterordner sind kein Ziel */
  excludeFolderIds?: string[]
}

export default function MoveModal({
  isOpen,
  onClose,
  onConfirm,
  itemsCount,
  isLoading = false,
  excludeFolderIds
}: MoveModalProps) {
  const [rows, setRows] = useState<MediaFolderRow[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const excludeKey = (excludeFolderIds ?? []).join(',')

  const folders = useMemo(() => {
    const excluded = withDescendants(rows, excludeKey ? excludeKey.split(',') : [])
    return rows
      .filter((f) => !excluded.has(f.id))
      .map((f) => ({ id: f.id, path: folderPath(rows, f.id) }))
      .sort((a, b) => a.path.localeCompare(b.path, 'de'))
  }, [rows, excludeKey])

  const fetchFolders = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase.from('media_folders').select('id, name, parent_id')
      if (error) throw error
      setRows((data ?? []) as MediaFolderRow[])
    } catch (err) {
      console.error('Error fetching virtual folders:', err)
      setFetchError('Die Ordner konnten nicht geladen werden.')
    } finally {
      setIsFetching(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen) {
      void fetchFolders()
      setSelectedFolder('') // Standard: Hauptverzeichnis
    }
  }, [isOpen, fetchFolders])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Zeile der Ordnerliste; gewählt = Akzentrahmen
  const optionClass = (active: boolean) =>
    cx(
      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] transition-colors has-[:focus-visible]:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
      active
        ? 'border-[var(--admin-accent,#F18652)] bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_8%,white)] font-medium text-[#0F172A]'
        : 'border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1] hover:bg-[#FAFAFC]'
    )
  const iconClass = (active: boolean) =>
    active ? 'shrink-0 text-[color-mix(in_srgb,var(--admin-accent,#F18652)_85%,black)]' : 'shrink-0 text-[#94A3B8]'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,.4)] p-4 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-modal-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,.15)]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm(selectedFolder);
          }
        }}
      >
        <div className="flex min-h-0 flex-col gap-3 px-5 pb-4 pt-5">
          <h2 id="move-modal-title" className="text-[16px] font-semibold text-[#0F172A]">Verschieben</h2>
          <p className="text-[14px] leading-relaxed text-[#475569]">
            Wählen Sie den Zielordner aus, in den {itemsCount === 1 ? 'das Element verschoben werden soll' : `die ${itemsCount} Elemente verschoben werden sollen`}.
          </p>

          {fetchError && <p className="text-[13px] text-[#B91C1C]" role="alert">{fetchError}</p>}

          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#64748B]" role="status">
              <Loader2 size={18} className="animate-spin" />
              <span>Lade Ordnerstruktur …</span>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Zielordner" className="-mr-2 flex max-h-[300px] min-h-0 flex-col gap-1.5 overflow-y-auto pr-2">
              {/* Root Option */}
              <label className={optionClass(selectedFolder === '')}>
                <input
                  type="radio"
                  name="folder"
                  value=""
                  checked={selectedFolder === ''}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="sr-only"
                />
                <Folder size={18} strokeWidth={1.75} className={iconClass(selectedFolder === '')} />
                <span>Hauptverzeichnis (Alle Medien)</span>
              </label>

              {/* Subfolders */}
              {folders.map(folder => (
                <label key={folder.id} className={optionClass(selectedFolder === folder.id)}>
                  <input
                    type="radio"
                    name="folder"
                    value={folder.id}
                    checked={selectedFolder === folder.id}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="sr-only"
                  />
                  <Folder size={18} strokeWidth={1.75} className={iconClass(selectedFolder === folder.id)} />
                  <span className="min-w-0 truncate" title={folder.path}>{folder.path}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#F1F5F9] bg-[#FAFAFC] px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading || isFetching}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" onClick={() => onConfirm(selectedFolder)} disabled={isLoading || isFetching}>
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {isLoading ? 'Bitte warten …' : 'Hierher verschieben'}
          </Button>
        </div>
      </div>
    </div>
  )
}
