'use client'

// Pop-up für die öffentliche Website. Pro Sitzung einmal je Bild (ein neues Bild
// erscheint wieder). Kein Cookie, nur sessionStorage im Browser, ohne Übermittlung.
// Für automatische Tests: sessionStorage "site-popup-gesehen" = "*" blendet es aus.
// Einbinden auf der gewünschten Seite: const popup = await getSitePopup();
// {popup && <SitePopup {...popup} />}

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { FREQUENCY_MS, popupAllowedOnPath, popupInWindow, type PopupFrequency, type PopupPages } from './options'

const STORAGE_KEY = 'site-popup-gesehen'

export interface SitePopupProps {
  imageUrl: string
  alt: string
  /** Erster und letzter Tag (JJJJ-MM-TT), leer = offen. */
  from?: string
  until?: string
  /** session: einmal pro Besuch (Standard), always: bei jedem Öffnen der Website, day/week: höchstens einmal pro Tag bzw. Woche. */
  frequency?: PopupFrequency
  /** Sekunden bis zum Erscheinen (0 = sofort). */
  delaySeconds?: number
  /** Auf welchen Seiten es erscheinen darf. */
  pages?: PopupPages
  paths?: string[]
}

/** Schon gesehen? day/week merken sich das im Browser (localStorage, nur Zeitpunkt und Bild), session nur für den Besuch. */
function alreadySeen(imageUrl: string, frequency: PopupFrequency): boolean {
  try {
    if (frequency === 'always') return false
    if (frequency === 'session') {
      const seen = sessionStorage.getItem(STORAGE_KEY)
      return seen === imageUrl || seen === '*'
    }
    if (sessionStorage.getItem(STORAGE_KEY) === '*') return true // Tests: blendet es immer aus
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const sep = raw.lastIndexOf('|')
    const url = raw.slice(0, sep)
    const at = Number(raw.slice(sep + 1))
    return url === imageUrl && Number.isFinite(at) && Date.now() - at < FREQUENCY_MS[frequency]
  } catch {
    return false // Speicher nicht verfügbar: Pop-up trotzdem anzeigen
  }
}

function markSeen(imageUrl: string, frequency: PopupFrequency) {
  try {
    if (frequency === 'always') return
    if (frequency === 'session') sessionStorage.setItem(STORAGE_KEY, imageUrl)
    else localStorage.setItem(STORAGE_KEY, `${imageUrl}|${Date.now()}`)
  } catch {
    /* ignorieren */
  }
}

export default function SitePopup({ imageUrl, alt, from = '', until = '', frequency = 'session', delaySeconds = 0, pages = 'all', paths = [] }: SitePopupProps) {
  const [visible, setVisible] = useState(false)
  // Erst zeigen, wenn das Bild geladen ist: vorher erschien kurz ein leerer weißer Kasten
  const [loaded, setLoaded] = useState(false)
  const shown = visible && loaded
  const pathname = usePathname() ?? '/'
  // Im Verwaltungsbereich nie anzeigen (das Pop-up ist für Besucher der Website)
  const inAdmin = pathname.startsWith('/admin')
  const closed = useRef(false) // bei „immer“: pro Seitenaufruf nur einmal, auch beim Wechsel zwischen Seiten
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pathsKey = paths.join('|')

  useEffect(() => {
    if (inAdmin || closed.current) return
    if (!popupInWindow(from, until)) return
    if (!popupAllowedOnPath(pathname, pages, pathsKey ? pathsKey.split('|') : [])) return
    if (alreadySeen(imageUrl, frequency)) return
    const timer = window.setTimeout(() => setVisible(true), Math.max(0, delaySeconds) * 1000)
    return () => window.clearTimeout(timer)
  }, [imageUrl, inAdmin, pathname, from, until, frequency, delaySeconds, pages, pathsKey])

  useEffect(() => {
    if (!shown) return
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
  }, [shown])

  function close() {
    setVisible(false)
    closed.current = true
    opener.current?.focus?.()
    markSeen(imageUrl, frequency)
  }

  if (!visible || inAdmin) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Hinweis'}
      aria-hidden={!shown}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-200 motion-reduce:transition-none ${shown ? 'opacity-100' : 'pointer-events-none invisible opacity-0'}`}
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
          loading="eager"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          onError={() => setVisible(false)}
        />
      </div>
    </div>
  )
}
