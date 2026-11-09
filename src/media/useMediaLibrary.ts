'use client'

// Daten und Aktionen der Mediathek (Ordner, Dateien, Upload, Verschieben, Löschen, Abgleich mit dem Speicher).
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
import {
  chunk,
  folderChain,
  folderIdsByPath,
  moveConflict,
  withDescendants,
  type MediaFileItem,
  type MediaFolderItem,
  type MediaFolderRow,
  type MediaItem,
} from './folder-tree'

interface UseMediaLibraryConfig {
  bucket?: string
  multiSelect?: boolean
  /** Bilder beim Upload verkleinern (Standard: an, 2000 px, WebP). */
  imageOptimization?: ImageOptimizationOptions
  /** false: nichts laden (z. B. solange das Fenster geschlossen ist). Standard: true. */
  enabled?: boolean
}

const FILE_COLUMNS = 'id, display_name, storage_path, url, size, mime_type, folder_id'
const SEARCH_DELAY_MS = 250
const PAGE = 1000

type FileRow = {
  id: string
  display_name: string
  storage_path: string
  url: string
  size: number | null
  mime_type: string | null
  folder_id: string | null
}

const message = (err: unknown, fallback: string): string => {
  const m = err && typeof err === 'object' && 'message' in err ? (err as { message?: unknown }).message : undefined
  return typeof m === 'string' && m ? m : fallback
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'de')

function toFile(f: FileRow, folderName?: string): MediaFileItem {
  return {
    id: f.id,
    name: f.display_name,
    url: f.url,
    size: f.size,
    storage_path: f.storage_path,
    mime_type: f.mime_type,
    folder_id: f.folder_id,
    ...(folderName !== undefined ? { folderName } : {}),
    isFolder: false,
  }
}

export function useMediaLibrary({
  bucket = 'images',
  multiSelect = true,
  imageOptimization,
  enabled = true,
}: UseMediaLibraryConfig = {}) {
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

  const loadFolders = useCallback(async (): Promise<MediaFolderRow[]> => {
    const { data, error: err } = await supabase.from('media_folders').select('id, name, parent_id')
    if (err) throw err
    return (data ?? []) as MediaFolderRow[]
  }, [supabase])

  const fetchItems = useCallback(
    async (folderId: string | null, search: string, { quiet = false } = {}) => {
      const id = ++requestId.current
      // Platzhalter nur beim ersten Laden und beim Ordnerwechsel, bei Suche und nach Änderungen bleibt die Ansicht stehen
      if (!quiet) setLoading(true)
      setError(null)
      try {
        const term = search.trim()
        const filesQuery = term
          ? supabase.from('media_files').select(FILE_COLUMNS).ilike('display_name', `%${term.replace(/[%_\\]/g, '\\$&')}%`).limit(500)
          : folderId
            ? supabase.from('media_files').select(FILE_COLUMNS).eq('folder_id', folderId)
            : supabase.from('media_files').select(FILE_COLUMNS).is('folder_id', null)
        const [allFolders, filesRes] = await Promise.all([loadFolders(), filesQuery])
        if (filesRes.error) throw filesRes.error
        if (id !== requestId.current) return

        const folderName = new Map(allFolders.map((f) => [f.id, f.name]))
        const files = ((filesRes.data ?? []) as FileRow[])
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
        setError(message(err, 'Fehler beim Laden der Medien aus der Datenbank'))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [supabase, loadFolders],
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

  const folderBreadcrumbs = useMemo(
    () => (debouncedSearch.trim() ? [] : folderChain(folders, currentFolderId).map((f) => ({ id: f.id, name: f.name }))),
    [folders, currentFolderId, debouncedSearch],
  )

  const navigateTo = (folderId: string) => {
    setSearchQuery('')
    setCurrentFolderId(folderId)
  }

  const navigateToBreadcrumb = (folderId: string | null) => {
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
    try {
      for (const file of prepared) {
        await uploadToLibrary(supabase, file, { bucket, folderId: currentFolderId })
        done++
      }
      toast.success(`${done} Datei(en) erfolgreich hochgeladen`)
    } catch (err) {
      console.error('Error uploading:', err)
      const text = message(err, 'Fehler beim Hochladen')
      setError(done ? `${done} von ${prepared.length} Dateien hochgeladen. ${text}` : text)
      toast.error(text)
    } finally {
      setUploading(false)
      await reload()
    }
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
    setBusy(true)
    try {
      const allFolders = await loadFolders()
      const folderIds = [...withDescendants(allFolders, selectedItems.filter((i) => i.isFolder).map((i) => i.id))]

      // Dateien: ausgewählte plus alle in den gelöschten Ordnern (beliebig tief)
      const files = new Map<string, string>()
      for (const item of selectedItems) if (!item.isFolder) files.set(item.id, item.storage_path)
      for (const ids of chunk(folderIds, 200)) {
        const { data, error: err } = await supabase.from('media_files').select('id, storage_path').in('folder_id', ids)
        if (err) throw err
        for (const f of data ?? []) files.set(f.id, f.storage_path)
      }

      // Erst im Speicher löschen. Scheitert das, bleiben die Einträge, damit nichts unsichtbar Platz belegt
      for (const paths of chunk([...files.values()].filter(Boolean), 100)) {
        const { error: err } = await supabase.storage.from(bucket).remove(paths)
        if (err) throw new Error(`Dateien konnten im Speicher nicht gelöscht werden (${err.message}). Es wurde nichts entfernt.`)
      }
      for (const ids of chunk([...files.keys()], 200)) {
        const { error: err } = await supabase.from('media_files').delete().in('id', ids)
        if (err) throw err
      }
      for (const ids of chunk(folderIds, 200)) {
        const { error: err } = await supabase.from('media_folders').delete().in('id', ids)
        if (err) throw err
      }

      const parts = [files.size && `${files.size} Datei(en)`, folderIds.length && `${folderIds.length} Ordner`].filter(Boolean)
      toast.success(`${parts.join(' und ')} gelöscht`)
      setSelectedItems([])
      // Steht man in einem gelöschten Ordner (z. B. nach einer Suche), zurück ins Hauptverzeichnis
      if (currentFolderId && folderIds.includes(currentFolderId)) setCurrentFolderId(null)
    } catch (err) {
      console.error('Error deleting:', err)
      setError(message(err, 'Fehler beim Löschen'))
      toast.error(message(err, 'Fehler beim Löschen'))
    } finally {
      setBusy(false)
      await reload()
    }
  }

  const handleCreateFolder = async (folderName: string) => {
    const name = folderName.trim()
    if (!name) return
    setBusy(true)
    try {
      const { error: dbError } = await supabase.from('media_folders').insert({ name: name.slice(0, 120), parent_id: currentFolderId })
      if (dbError) throw dbError
      toast.success(`Ordner "${name}" erstellt`)
    } catch (err) {
      console.error('Error creating folder:', err)
      setError(message(err, 'Fehler beim Erstellen des Ordners'))
      toast.error('Fehler beim Erstellen des Ordners')
    } finally {
      setBusy(false)
      await reload()
    }
  }

  const handleRename = async (newName: string) => {
    const name = newName.trim()
    if (selectedItems.length !== 1 || !name) return
    setBusy(true)
    const target = selectedItems[0]
    try {
      const { error: dbError } = target.isFolder
        ? await supabase.from('media_folders').update({ name: name.slice(0, 120) }).eq('id', target.id)
        : await supabase.from('media_files').update({ display_name: name }).eq('id', target.id)
      if (dbError) throw dbError
      toast.success('Erfolgreich umbenannt')
      setSelectedItems([])
    } catch (err) {
      console.error('Error renaming:', err)
      setError(message(err, 'Fehler beim Umbenennen'))
      toast.error('Fehler beim Umbenennen')
    } finally {
      setBusy(false)
      await reload()
    }
  }

  /** Verschiebt Dateien und Ordner. Liefert false, wenn nichts verschoben wurde. */
  const moveItems = async (itemsToMove: MediaItem[], destinationFolderId: string | null): Promise<boolean> => {
    if (!itemsToMove || itemsToMove.length === 0) return false
    const targetFolderId = destinationFolderId === '' ? null : destinationFolderId
    const fileIds = itemsToMove.filter((i) => !i.isFolder).map((i) => i.id)
    const folderIds = itemsToMove.filter((i) => i.isFolder).map((i) => i.id)

    setBusy(true)
    try {
      // Prüfen mit dem aktuellen Stand der Datenbank (die Datenbank prüft ab v0.16.0 zusätzlich selbst)
      const conflict = moveConflict(folderIds.length ? await loadFolders() : [], folderIds, targetFolderId)
      if (conflict) throw new Error(conflict)

      if (fileIds.length > 0) {
        const { error: dbError } = await supabase.from('media_files').update({ folder_id: targetFolderId }).in('id', fileIds)
        if (dbError) throw dbError
      }
      if (folderIds.length > 0) {
        const { error: dbError } = await supabase.from('media_folders').update({ parent_id: targetFolderId }).in('id', folderIds)
        if (dbError) throw dbError
      }
      toast.success(`${fileIds.length + folderIds.length} Element(e) verschoben`)
      setSelectedItems([])
      return true
    } catch (err) {
      console.error('Error moving items:', err)
      setError(message(err, 'Fehler beim Verschieben'))
      toast.error(message(err, 'Fehler beim Verschieben'))
      return false
    } finally {
      setBusy(false)
      await reload()
    }
  }

  const handleMove = (destinationFolderId: string) => moveItems(selectedItems, destinationFolderId)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      // Alle Dateien im Speicher, seitenweise und rekursiv
      const storageFiles: { storage_path: string; size: number | null; mime_type: string | null }[] = []
      const walk = async (path: string) => {
        for (let offset = 0; ; offset += PAGE) {
          const { data, error: err } = await supabase.storage.from(bucket).list(path, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
          if (err) throw err
          for (const item of data ?? []) {
            if (item.name === '.emptyFolderPlaceholder') continue
            const fullPath = path ? `${path}/${item.name}` : item.name
            if (!item.metadata) await walk(fullPath)
            else storageFiles.push({ storage_path: fullPath, size: item.metadata.size ?? null, mime_type: item.metadata.mimetype ?? null })
          }
          if (!data || data.length < PAGE) break
        }
      }
      toast.info('Durchsuche den Speicher nach neuen Dateien …')
      await walk('')

      // Schon eingetragene Pfade in einem Rutsch (seitenweise) statt einer Abfrage je Datei
      const known = new Set<string>()
      for (let from = 0; ; from += PAGE) {
        const { data, error: err } = await supabase.from('media_files').select('storage_path').order('storage_path').range(from, from + PAGE - 1)
        if (err) throw err
        for (const row of data ?? []) known.add(row.storage_path)
        if (!data || data.length < PAGE) break
      }
      const fresh = storageFiles.filter((f) => !known.has(f.storage_path))

      // Ordner nach Pfad; fehlende werden einmal angelegt
      const allFolders = await loadFolders()
      const byPath = folderIdsByPath(allFolders)
      const ensureFolder = async (parts: string[]): Promise<string | null> => {
        let parentId: string | null = null
        for (let i = 0; i < parts.length; i++) {
          const path = parts.slice(0, i + 1).join('/')
          const existing = byPath.get(path)
          if (existing) {
            parentId = existing
            continue
          }
          const { data, error: err }: { data: { id: string } | null; error: Error | null } = await supabase
            .from('media_folders')
            .insert({ name: parts[i], parent_id: parentId })
            .select('id')
            .single()
          if (!data) throw err ?? new Error('Ordner konnte nicht angelegt werden')
          if (err) throw err
          byPath.set(path, data.id)
          parentId = data.id
        }
        return parentId
      }

      const rows = []
      for (const file of fresh) {
        const parts = file.storage_path.split('/')
        const fileName = parts.pop() || file.storage_path
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.storage_path)
        rows.push({
          storage_path: file.storage_path,
          display_name: fileName,
          url: publicUrl,
          size: file.size,
          mime_type: file.mime_type,
          folder_id: parts.length ? await ensureFolder(parts) : null,
        })
      }
      let imported = 0
      for (const part of chunk(rows, 200)) {
        const { error: err } = await supabase.from('media_files').insert(part)
        if (err) throw err
        imported += part.length
      }
      toast.success(imported ? `${imported} neue Datei(en) übernommen` : 'Alles aktuell, keine neuen Dateien gefunden')
    } catch (err) {
      console.error('Error syncing storage details:', err)
      setError(message(err, 'Fehler beim Abgleich mit dem Speicher'))
      toast.error(`Fehler: ${message(err, 'Details in der Konsole')}`)
    } finally {
      setSyncing(false)
      await reload()
    }
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
    navigateToBreadcrumb,
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
