'use client'

// Quelle: template/src/components/ui/DeleteConfirmModal.tsx
// Darstellung über ConfirmDialog aus dem Admin-Kit; Schrift wird hier gesetzt,
// weil das Fenster auch außerhalb von AdminShell geöffnet wird.

import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'

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
    <div className="font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!">
      <ConfirmDialog
        open={isOpen}
        title={title}
        confirmLabel="Endgültig löschen"
        pending={isDeleting}
        onConfirm={() => onConfirm(deleteImages)}
        onCancel={onClose}
      >
        <p>{description}</p>
        {showImageCheckbox && (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[14px] text-[#0F172A]">
            <input
              type="checkbox"
              checked={deleteImages}
              onChange={(e) => setDeleteImages(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--admin-accent,#F18652)]"
            />
            <span>{imageCheckboxLabel}</span>
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}
