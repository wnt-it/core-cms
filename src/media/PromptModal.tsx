'use client'

// Quelle: template/src/components/ui/PromptModal.tsx
import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  description?: string
  initialValue?: string
  placeholder?: string
  confirmLabel?: string
  isLoading?: boolean
}

export default function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  initialValue = '',
  placeholder = '',
  confirmLabel = 'Speichern',
  isLoading = false
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue)

  // Update internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
    }
  }, [isOpen, initialValue])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-black/5">
          <h3 className="font-display font-bold text-lg text-black">{title}</h3>
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
            if (value.trim()) onConfirm(value.trim());
          }
        }}>
          {/* Body */}
          <div className="p-6">
            {description && (
              <p className="text-[#555555] text-[14px] font-sans leading-relaxed mb-4">
                {description}
              </p>
            )}

            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full h-12 px-4 rounded-xl border border-black/10 bg-neutral-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-sans text-[15px]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-[14px] font-bold text-[#555555] hover:text-black hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => onConfirm(value.trim())}
              disabled={isLoading || !value.trim() || value.trim() === initialValue}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Check size={16} />
              {isLoading ? 'Bitte warten...' : confirmLabel}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
