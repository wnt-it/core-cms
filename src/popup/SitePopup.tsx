'use client'

// Pop-up für die öffentliche Website. Pro Sitzung einmal je Bild (ein neues Bild
// erscheint wieder). Kein Cookie, nur sessionStorage im Browser, ohne Übermittlung.
// Für automatische Tests: sessionStorage "site-popup-gesehen" = "*" blendet es aus.
// Einbinden auf der gewünschten Seite: const popup = await getSitePopup();
// {popup && <SitePopup {...popup} />}

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'site-popup-gesehen'

export default function SitePopup({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(STORAGE_KEY)
      if (seen === imageUrl || seen === '*') return
    } catch {
      // sessionStorage nicht verfügbar: Pop-up trotzdem anzeigen
    }
    setVisible(true)
  }, [imageUrl])

  useEffect(() => {
    if (!visible) return
    opener.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      // Einziges bedienbares Element: Fokus bleibt auf „Schließen“
      if (e.key === 'Tab') {
        e.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function close() {
    setVisible(false)
    opener.current?.focus?.()
    try {
      sessionStorage.setItem(STORAGE_KEY, imageUrl)
    } catch {
      /* ignorieren */
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Hinweis'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div className="relative max-h-full w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Schließen"
          className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-white/90 p-1.5 text-black shadow hover:bg-white"
        >
          <X size={22} />
        </button>
        <Image
          src={imageUrl}
          alt={alt}
          width={1000}
          height={1000}
          sizes="(max-width: 600px) 92vw, 560px"
          className="h-auto max-h-[90vh] w-full bg-white object-contain"
          priority
        />
      </div>
    </div>
  )
}
