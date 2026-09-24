'use client'

// Quelle: template/src/components/ui/DeleteConfirmModal.tsx
import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteImages: boolean) => void
  title: string
  description: string
  showImageCheckbox?: boolean
  imageCheckboxLabel?: string
  isDeleting?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  showImageCheckbox = false,
  imageCheckboxLabel = "Auch dazugehörige Bilder vom Server löschen",
  isDeleting = false
}: DeleteConfirmModalProps) {
  const [deleteImages, setDeleteImages] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-3 text-red-600">
            <div className="p-2 bg-red-50 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-display font-bold text-lg">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#888888] hover:text-black hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-[#555555] text-[15px] font-sans leading-relaxed">
            {description}
          </p>

          {showImageCheckbox && (
            <div className="mt-6 pt-4 border-t border-black/5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={deleteImages}
                    onChange={(e) => setDeleteImages(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-black/20 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary/50">
                    <svg
                      className={`w-3.5 h-3.5 text-white transition-opacity ${deleteImages ? 'opacity-100' : 'opacity-0'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[14px] text-black font-medium group-hover:text-primary transition-colors">
                  {imageCheckboxLabel}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 border-t border-black/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-[14px] font-bold text-[#555555] hover:text-black hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onConfirm(deleteImages)}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-[14px] font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
          </button>
        </div>

      </div>
    </div>
  )
}
