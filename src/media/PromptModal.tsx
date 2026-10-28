'use client'

// Quelle: template/src/components/ui/PromptModal.tsx
// Kleines Eingabefenster (Ordner anlegen, umbenennen). Escape schließt.

import { useState, useEffect } from 'react'
import { Button } from '../ui/components'
import { inputClass } from '../ui/styles'

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

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,.4)] p-4 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-modal-title"
        className="w-full max-w-[420px] overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,.15)]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) onConfirm(value.trim());
          }
        }}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 id="prompt-modal-title" className="text-[16px] font-semibold text-[#0F172A]">{title}</h2>
          {description && (
            <p className="text-[14px] leading-relaxed text-[#475569]">{description}</p>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label={title}
            autoFocus
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-[#F1F5F9] bg-[#FAFAFC] px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(value.trim())}
            disabled={isLoading || !value.trim() || value.trim() === initialValue}
          >
            {isLoading ? 'Bitte warten …' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
