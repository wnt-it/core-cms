'use client'

// Quelle: template/src/components/ui/MoveModal.tsx
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.

import { useState, useEffect } from 'react'
import { X, Folder, MoveRight, Loader2 } from 'lucide-react'
import { createClient } from '../supabase/client'

interface MoveModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (destinationPath: string) => void
  bucket: string
  itemsCount: number
  isLoading?: boolean
}

export default function MoveModal({
  isOpen,
  onClose,
  onConfirm,
  bucket,
  itemsCount,
  isLoading = false
}: MoveModalProps) {
  const [folders, setFolders] = useState<{ id: string, path: string }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [isFetching, setIsFetching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchFolders()
      setSelectedFolder('') // default to root
    }
  }, [isOpen])

  const fetchFolders = async () => {
    setIsFetching(true)
    try {
      const { data, error } = await supabase
        .from('media_folders')
        .select('id, name, parent_id')

      if (error) throw error

      if (data) {
        const folderMap = new Map<string, { name: string, parent_id: string | null }>()
        data.forEach(f => folderMap.set(f.id, { name: f.name, parent_id: f.parent_id }))

        const getPath = (id: string): string => {
          const f = folderMap.get(id)
          if (!f) return ''
          if (f.parent_id) {
            return `${getPath(f.parent_id)} / ${f.name}`
          }
          return f.name
        }

        const formatted = data.map(f => ({
          id: f.id,
          path: getPath(f.id)
        })).sort((a, b) => a.path.localeCompare(b.path))

        setFolders(formatted)
      }
    } catch (err) {
      console.error('Error fetching virtual folders:', err)
    } finally {
      setIsFetching(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 rounded-full">
              <MoveRight size={20} className="text-black" />
            </div>
            <h3 className="font-display font-bold text-lg text-black">Verschieben</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#888888] hover:text-black hover:bg-neutral-100 rounded-full transition-colors -mr-2 -mt-2"
          >
            <X size={20} />
          </button>
        </div>

        <div onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm(selectedFolder);
          }
        }}>
          {/* Body */}
          <div className="p-6">
            <p className="text-[#555555] text-[14px] font-sans leading-relaxed mb-6">
              Wählen Sie den Zielordner aus, in den {itemsCount === 1 ? 'das Element' : `die ${itemsCount} Elemente`} verschoben werden sollen.
            </p>

            {isFetching ? (
              <div className="flex items-center justify-center p-8 text-[#888888]">
                <Loader2 size={24} className="animate-spin" />
                <span className="ml-3 text-sm">Lade Ordnerstruktur...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Root Option */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedFolder === ''
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-black/10 hover:border-black/30 hover:bg-neutral-50'
                }`}>
                  <input
                    type="radio"
                    name="folder"
                    value=""
                    checked={selectedFolder === ''}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="sr-only"
                  />
                  <Folder size={18} className={selectedFolder === '' ? 'text-primary' : 'text-[#888888]'} />
                  <span className={`text-[15px] ${selectedFolder === '' ? 'font-bold text-primary' : 'font-medium text-black'}`}>
                    Hauptverzeichnis (root)
                  </span>
                </label>

                {/* Subfolders */}
                {folders.map(folder => (
                  <label key={folder.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedFolder === folder.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-black/10 hover:border-black/30 hover:bg-neutral-50'
                  }`}>
                    <input
                      type="radio"
                      name="folder"
                      value={folder.id}
                      checked={selectedFolder === folder.id}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="sr-only"
                    />
                    <Folder size={18} className={selectedFolder === folder.id ? 'text-primary' : 'text-[#888888]'} />
                    <span className={`text-[15px] truncate ${selectedFolder === folder.id ? 'font-bold text-primary' : 'font-medium text-black'}`}>
                      {folder.path}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isFetching}
              className="px-5 py-2.5 text-[14px] font-bold text-[#555555] hover:text-black hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedFolder)}
              disabled={isLoading || isFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MoveRight size={16} />}
              {isLoading ? 'Bitte warten...' : 'Hierher verschieben'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
