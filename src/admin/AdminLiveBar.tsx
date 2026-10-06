'use client'

// Schwebende Admin-Leiste für die öffentliche Website: erscheint nur für
// angemeldete Nutzer (nicht auf /admin) und führt mit einem Klick ins Dashboard.
// Einbindung: <AdminLiveBar /> einmal im Root-Layout des Projekts.

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronUp, LogOut, X } from 'lucide-react'
import { createClient } from '../supabase/client'

export interface AdminLiveBarLink {
  href: string
  label: string
  /** Fertiges Element, z.B. <Inbox size={16} />. Keine Komponente (Funktionen dürfen nicht von einem Server-Layout in diese Client-Komponente gereicht werden). */
  icon?: ReactNode
  /** Zeigt hinter dem Eintrag die Zahl neuer Anfragen (Status „Neu“) an – für den Posteingang. */
  showNewSubmissions?: boolean
}

export interface AdminLiveBarProps {
  /** Ziel des Dashboard-Buttons (Standard: /admin). */
  dashboardHref?: string
  /** Projektspezifische Schnellzugriffe im Ausklappmenü. */
  links?: AdminLiveBarLink[]
}

export default function AdminLiveBar({ dashboardHref = '/admin', links = [] }: AdminLiveBarProps) {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) setLoggedIn(!!data.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Zahl neuer Anfragen (nur wenn ein Eintrag sie anzeigen soll; Fehler werden ignoriert)
  const wantsCount = links.some((l) => l.showNewSubmissions)
  useEffect(() => {
    if (!loggedIn || !wantsCount) return
    let active = true
    createClient()
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Neu')
      .then(({ count }) => {
        if (active) setNewCount(count ?? 0)
      })
    return () => {
      active = false
    }
  }, [loggedIn, wantsCount, pathname])

  // Menü beim Seitenwechsel schließen
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!loggedIn || dismissed || pathname?.startsWith('/admin')) return null

  const handleLogout = async () => {
    await createClient().auth.signOut()
    setLoggedIn(false)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 px-4 w-full max-w-md sm:w-auto sm:max-w-none">
      {open && (
        <div className="mb-2 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
          {links.map((link) => {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-black hover:bg-black/5"
              >
                {link.icon && <span className="text-primary">{link.icon}</span>}
                <span>{link.label}</span>
                {link.showNewSubmissions && newCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{newCount}</span>
                )}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-black hover:bg-black/5"
          >
            <LogOut size={16} className="text-primary" />
            <span>Abmelden</span>
          </button>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-xl">
        <Link
          href={dashboardHref}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          <LayoutDashboard size={16} />
          <span>Zum Dashboard</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={open}
          className="relative rounded-full p-2 text-black hover:bg-black/5"
        >
          {newCount > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600" />}
          <ChevronUp size={18} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Leiste ausblenden"
          className="rounded-full p-2 text-black/60 hover:bg-black/5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
