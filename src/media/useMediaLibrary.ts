'use client'

// Zustand der Mediathek (Ordner, Dateien, Auswahl, Suche) und die Aktionen dazu. Die eigentlichen Datenbank- und
// Speicher-Aufrufe stehen in media-actions.ts, die reinen Ordner-Helfer in folder-tree.ts.
//
// Ab v0.16.0:
// - lädt nur, solange die Mediathek offen ist (`enabled`), nicht schon beim Seitenaufbau des Admins
// - Suche wartet kurz, bis nicht mehr getippt wird; eine ältere Antwort überschreibt nie eine neuere
// - Ordner und Dateien kommen parallel, der Pfad oben aus derselben Ordnerliste (statt Abfrage je Ebene)
// - Ordner lassen sich nicht in sich selbst oder einen eigenen Unterordner verschieben
// - Löschen eines Ordners löscht auch Unterordner und Dateien darin (vorher landeten die Dateien im Hauptverzeichnis);
//   scheitert das Löschen im Speicher, bleiben die Einträge erhalten
// - Abgleich liest den Speicher seitenweise (keine Grenze bei 150 Dateien) und trägt neue Dateien gesammelt ein

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '../supabase/client'
import { toast } from 'sonner'
import { confirmLargeFiles } from './upload-limits'
import type { ImageOptimizationOptions } from './image-prepare'
import { prepareFilesForUpload } from './prepare-uploads'
import { uploadToLibrary } from './upload-to-library'
import { folderChain, withDescendants, type MediaFolderItem, type MediaFolderRow, type MediaItem } from './folder-tree'
import { byName, deleteMediaItems, errorMessage, loadFiles, loadFolders, moveMediaItems, syncStorage, toFile } from './media-actions'

interface UseMediaLibraryConfig {
  bucket?: string
  multiSelect?: boolean
  /** Bilder beim Upload verkleinern (Standard: an, 2000 px, WebP). */
  imageOptimization?: ImageOptimizationOptions
  /** false: nichts laden (z. B. solange das Fenster geschlossen ist). Standard: true. */
  enabled?: boolean
}

const SEARCH_DELAY_MS = 250

export function useMediaLibrary({ bucket = 'images', multiSelect = true, imageOptimization, enabled = true }: UseMediaLibraryConfig = {}) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [folders, setFolders] = useState<MediaFolderRow[]>([])
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  /** Eine Änderung läuft (Löschen, Verschieben …): Knöpfe sperren, Ansicht bleibt stehen */
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  /** Laufende Nummer der Abfrage: Nur die neueste darf die Anzeige setzen */
  const requestId = useRef(0)
  const hasLoaded = useRef(false)

  // Suche erst nach einer kurzen Tipp-Pause; Leeren wirkt sofort
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearch('')
      return
    }
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchItems = useCallback(
    async (folderId: string | null, search: string, { quiet = false } = {}) => {
      const id = ++requestId.current
      // Platzhalter nur beim ersten Laden und beim Ordnerwechsel, bei Suche und nach Änderungen bleibt die Ansicht stehen
      if (!quiet) setLoading(true)
      setError(null)
      try {
        const term = search.trim()
        const [allFolders, fileRows] = await Promise.all([loadFolders(supabase), loadFiles(supabase, folderId, term)])
        if (id !== requestId.current) return

        const folderName = new Map(allFolders.map((f) => [f.id, f.name]))
        const files = fileRows
          .map((f) => toFile(f, term ? (f.folder_id ? folderName.get(f.folder_id) ?? 'Unterordner' : 'Hauptverzeichnis') : undefined))
          .sort(byName)
        const subfolders: MediaFolderItem[] = term
          ? []
          : allFolders
              .filter((f) => f.parent_id === folderId)
              .map((f) => ({ id: f.id, name: f.name, isFolder: true as const }))
              .sort(byName)

        setFolders(allFolders)
        setItems([...subfolders, ...files])
        setSelectedItems([])
        hasLoaded.current = true
      } catch (err) {
        if (id !== requestId.current) return
        console.error('Error fetching media items:', err)
        setError(errorMessage(err, 'Fehler beim Laden der Medien aus der Datenbank'))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [supabase],
  )

  const lastFolder = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    const folderChanged = lastFolder.current !== currentFolderId
    lastFolder.current = currentFolderId
    void fetchItems(currentFolderId, debouncedSearch, { quiet: hasLoaded.current && !folderChanged })
  }, [enabled, currentFolderId, debouncedSearch, fetchItems])

  /** Nach einer Änderung neu laden, ohne Platzhalter */
  const reload = useCallback(() => fetchItems(currentFolderId, debouncedSearch, { quiet: true }), [fetchItems, currentFolderId, debouncedSearch])

  /**
   * Führt eine Änderung aus: sperrt die Knöpfe, zeigt Erfolg oder Fehler und lädt danach neu.
   * Liefert true bei Erfolg.
   */
  const run = async (failText: string, action: () => Promise<string | void>, setRunning: (v: boolean) => void = setBusy): Promise<boolean> => {
    setRunning(true)
    setError(null)
    try {
      const done = await action()
      if (done) toast.success(done)
      return true
    } catch (err) {
      console.error(`${failText}:`, err)
      setError(errorMessage(err, failText))
      toast.error(errorMessage(err, failText))
      return false
    } finally {
      setRunning(false)
      await reload()
    }
  }

  const folderBreadcrumbs = useMemo(
    () => (debouncedSearch.trim() ? [] : folderChain(folders, currentFolderId).map((f) => ({ id: f.id, name: f.name }))),
    [folders, currentFolderId, debouncedSearch],
  )

  const navigateTo = (folderId: string | null) => {
    setSearchQuery('')
    setCurrentFolderId(folderId)
  }

  const toggleSelection = (item: MediaItem) => {
    if (multiSelect) {
      setSelectedItems((prev) => (prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]))
    } else {
      setSelectedItems((prev) => (prev.some((i) => i.id === item.id) ? [] : [item]))
    }
  }

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    // Bilder zuerst verkleinern; nur noch große Restdateien (PDF, SVG, GIF …) fragen nach
    const prepared = await prepareFilesForUpload(Array.from(files), imageOptimization)
    if (!confirmLargeFiles(prepared)) {
      setUploading(false)
      return
    }

    let done = 0
    await run(
      'Fehler beim Hochladen',
      async () => {
        try {
          for (const file of prepared) {
            await uploadToLibrary(supabase, file, { bucket, folderId: currentFolderId })
            done++
          }
        } catch (err) {
          // Teilweise hochgeladen: sagen, wie viele schon da sind
          if (done) throw new Error(`${done} von ${prepared.length} Dateien hochgeladen. ${errorMessage(err, 'Fehler beim Hochladen')}`)
          throw err
        }
        return `${done} Datei(en) erfolgreich hochgeladen`
      },
      setUploading,
    )
  }

  /** Was beim Löschen der Auswahl alles wegfällt (für die Rückfrage). */
  const deletePreview = useCallback(
    (selection: MediaItem[] = selectedItems) => {
      const folderIds = selection.filter((i) => i.isFolder).map((i) => i.id)
      const affected = withDescendants(folders, folderIds)
      return { folders: affected.size, subfolders: affected.size - folderIds.length, files: selection.filter((i) => !i.isFolder).length }
    },
    [folders, selectedItems],
  )

  const confirmDelete = async () => {
    if (selectedItems.length === 0) return
    await run('Fehler beim Löschen', async () => {
      const { fileCount, folderIds } = await deleteMediaItems(supabase, bucket, selectedItems)
      setSelectedItems([])
      // Steht man in einem gelöschten Ordner (z. B. nach einer Suche), zurück ins Hauptverzeichnis
      if (currentFolderId && folderIds.includes(currentFolderId)) setCurrentFolderId(null)
      const parts = [fileCount && `${fileCount} Datei(en)`, folderIds.length && `${folderIds.length} Ordner`].filter(Boolean)
      return `${parts.join(' und ')} gelöscht`
    })
  }

  const handleCreateFolder = async (folderName: string) => {
    const name = folderName.trim()
    if (!name) return
    await run('Fehler beim Erstellen des Ordners', async () => {
      const { error: err } = await supabase.from('media_folders').insert({ name: name.slice(0, 120), parent_id: currentFolderId })
      if (err) throw err
      return `Ordner "${name}" erstellt`
    })
  }

  const handleRename = async (newName: string) => {
    const name = newName.trim()
    if (selectedItems.length !== 1 || !name) return
    const target = selectedItems[0]
    await run('Fehler beim Umbenennen', async () => {
      const { error: err } = target.isFolder
        ? await supabase.from('media_folders').update({ name: name.slice(0, 120) }).eq('id', target.id)
        : await supabase.from('media_files').update({ display_name: name }).eq('id', target.id)
      if (err) throw err
      setSelectedItems([])
      return 'Erfolgreich umbenannt'
    })
  }

  /** Verschiebt Dateien und Ordner. Liefert false, wenn nichts verschoben wurde. */
  const moveItems = async (itemsToMove: MediaItem[], destinationFolderId: string | null): Promise<boolean> => {
    if (!itemsToMove || itemsToMove.length === 0) return false
    const target = destinationFolderId === '' ? null : destinationFolderId
    return run('Fehler beim Verschieben', async () => {
      const count = await moveMediaItems(supabase, itemsToMove, target)
      setSelectedItems([])
      return `${count} Element(e) verschoben`
    })
  }

  const handleMove = (destinationFolderId: string) => moveItems(selectedItems, destinationFolderId)

  const handleSync = async () => {
    await run(
      'Fehler beim Abgleich mit dem Speicher',
      async () => {
        toast.info('Durchsuche den Speicher nach neuen Dateien …')
        const imported = await syncStorage(supabase, bucket)
        return imported ? `${imported} neue Datei(en) übernommen` : 'Alles aktuell, keine neuen Dateien gefunden'
      },
      setSyncing,
    )
  }

  return {
    currentFolderId,
    folderBreadcrumbs,
    searchQuery,
    /** Suchbegriff, nach dem die aktuelle Liste gefiltert ist (nach der Tipp-Pause) */
    activeSearch: debouncedSearch,
    setSearchQuery,
    folders,
    items,
    loading,
    busy,
    uploading,
    syncing,
    selectedItems,
    error,
    setError,
    setSelectedItems,
    navigateTo,
    /** Gleich wie navigateTo, auch für das Hauptverzeichnis (null); bleibt für bestehende Aufrufer */
    navigateToBreadcrumb: navigateTo,
    toggleSelection,
    handleUpload,
    deletePreview,
    confirmDelete,
    handleCreateFolder,
    handleRename,
    handleMove,
    moveItems,
    handleSync,
    refetch: reload,
  }
}
