'use client'

// Werkzeugleiste der Mediathek: Ordnerpfad (auch Ablageziel beim Ziehen) oder Suchtreffer, Suche,
// Abgleich, neuer Ordner, Hochladen.

import { useState, type DragEvent } from 'react'
import { X, UploadCloud, Loader2, RefreshCw, FolderPlus, Search } from 'lucide-react'
import { Button } from '../ui/components'
import { cx, inputClass } from '../ui/styles'

interface MediaToolbarProps {
  currentFolderId: string | null
  breadcrumbs: { id: string; name: string }[]
  searchQuery: string
  activeSearch: string
  resultCount: number
  onSearch: (q: string) => void
  onNavigate: (folderId: string | null) => void
  /** Etwas wurde auf einen Ordner im Pfad gezogen (null = Hauptverzeichnis) */
  onDropOnCrumb: (e: DragEvent, folderId: string | null) => void
  onSync: () => void
  onCreateFolder: () => void
  onUploadClick: () => void
  syncing: boolean
  uploading: boolean
  /** Laden oder eine Änderung läuft: Abgleich gesperrt */
  locked: boolean
}

// Ordnerpfad: aktueller Ordner fett, Ablegeziel mit Akzent
const crumbClass = (active: boolean, dropHover: boolean) =>
  cx(
    'shrink-0 cursor-pointer rounded-md px-1.5 py-1 outline-none transition-colors focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]',
    dropHover
      ? 'bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_12%,white)] text-[#0F172A] ring-1 ring-[var(--admin-accent,#F18652)]'
      : active
        ? 'font-medium text-[#0F172A]'
        : 'text-[#64748B] hover:text-[#0F172A]',
  )

export default function MediaToolbar({
  currentFolderId,
  breadcrumbs,
  searchQuery,
  activeSearch,
  resultCount,
  onSearch,
  onNavigate,
  onDropOnCrumb,
  onSync,
  onCreateFolder,
  onUploadClick,
  syncing,
  uploading,
  locked,
}: MediaToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const isSearchActive = activeSearch.trim().length > 0

  const crumb = (id: string | null, label: string, title: string) => {
    const key = id ?? 'root'
    const active = id === currentFolderId
    return (
      <button
        type="button"
        onClick={() => onNavigate(id)}
        onDragOver={(e) => {
          e.preventDefault()
          setHovered(key)
        }}
        onDragLeave={() => setHovered(null)}
        onDrop={(e) => {
          setHovered(null)
          onDropOnCrumb(e, id)
        }}
        className={crumbClass(active, hovered === key)}
        aria-current={active ? 'location' : undefined}
        title={title}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-[#F1F5F9] px-4 py-3 sm:px-6">
      {isSearchActive ? (
        <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#64748B] md:basis-0">
          <span className="min-w-0 truncate">
            Treffer für <strong className="font-medium text-[#0F172A]">„{activeSearch}“</strong> · {resultCount}
          </span>
          <button
            type="button"
            onClick={() => onSearch('')}
            className="cursor-pointer rounded text-[13px] font-medium text-[#334155] underline underline-offset-2 outline-none hover:text-[#0F172A] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]"
          >
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        <nav aria-label="Ordnerpfad" className="-mx-1.5 flex min-w-0 flex-1 basis-full items-center gap-0.5 overflow-x-auto px-0 text-[14px] md:basis-0">
          {crumb(null, 'Alle Medien', 'Hier ablegen, um Bilder ins Hauptverzeichnis zu verschieben')}
          {breadcrumbs.map((c) => (
            <span key={c.id} className="flex shrink-0 items-center gap-0.5">
              <span aria-hidden="true" className="text-[#CBD5E1]">/</span>
              {crumb(c.id, c.name, `Hier ablegen, um Bilder in „${c.name}“ zu verschieben`)}
            </span>
          ))}
        </nav>
      )}

      <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap">
        <span className="relative flex w-full sm:w-auto sm:flex-1 md:w-[240px] md:flex-none">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
          <input
            type="text"
            placeholder="Bildname suchen"
            aria-label="Bildname suchen"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className={cx(inputClass, 'h-9 pl-9 pr-8 focus:border-[var(--admin-accent,#F18652)] focus:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]')}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearch('')}
              aria-label="Suche leeren"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X size={14} />
            </button>
          )}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncing || locked}
          title="Cloud-Speicher scannen und neue Dateien automatisch registrieren"
          aria-label={syncing ? 'Synchronisiere …' : 'Synchronisieren'}
        >
          <RefreshCw size={15} strokeWidth={1.75} className={syncing ? 'animate-spin' : ''} />
          <span className="hidden lg:inline">{syncing ? 'Synchronisiere …' : 'Synchronisieren'}</span>
        </Button>

        {!isSearchActive && (
          <Button variant="secondary" size="sm" onClick={onCreateFolder}>
            <FolderPlus size={15} strokeWidth={1.75} />
            <span>Neuer Ordner</span>
          </Button>
        )}

        <Button variant="primary" size="sm" onClick={onUploadClick} disabled={uploading} className="ml-auto md:ml-0">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} strokeWidth={1.75} />}
          <span>{uploading ? 'Lädt …' : 'Hochladen'}</span>
        </Button>
      </div>
    </div>
  )
}
