// Datenbank- und Speicher-Aktionen der Mediathek, ohne React-Zustand. useMediaLibrary ruft sie auf und kümmert sich
// um Anzeige, Meldungen und Neuladen. Jede Funktion wirft bei einem Fehler, mit einer verständlichen Meldung.

import type { createClient } from '../supabase/client'
import { chunk, folderIdsByPath, moveConflict, withDescendants, type MediaFileItem, type MediaFolderRow, type MediaItem } from './folder-tree'

type Supabase = ReturnType<typeof createClient>

export const FILE_COLUMNS = 'id, display_name, storage_path, url, size, mime_type, folder_id'
const PAGE = 1000

export type FileRow = {
  id: string
  display_name: string
  storage_path: string
  url: string
  size: number | null
  mime_type: string | null
  folder_id: string | null
}

/** Fehlermeldung aus einem beliebigen Fehlerobjekt, sonst der Ersatztext */
export const errorMessage = (err: unknown, fallback: string): string => {
  const m = err && typeof err === 'object' && 'message' in err ? (err as { message?: unknown }).message : undefined
  return typeof m === 'string' && m ? m : fallback
}

export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'de')

export function toFile(f: FileRow, folderName?: string): MediaFileItem {
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

export async function loadFolders(supabase: Supabase): Promise<MediaFolderRow[]> {
  const { data, error } = await supabase.from('media_folders').select('id, name, parent_id')
  if (error) throw error
  return (data ?? []) as MediaFolderRow[]
}

/** Dateien eines Ordners (null = Hauptverzeichnis) oder, mit Suchbegriff, aus allen Ordnern (max. 500) */
export async function loadFiles(supabase: Supabase, folderId: string | null, term: string): Promise<FileRow[]> {
  const base = supabase.from('media_files').select(FILE_COLUMNS)
  const query = term
    ? base.ilike('display_name', `%${term.replace(/[%_\\]/g, '\\$&')}%`).limit(500)
    : folderId
      ? base.eq('folder_id', folderId)
      : base.is('folder_id', null)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as FileRow[]
}

/**
 * Löscht die Auswahl: Dateien sowie Ordner mit allen Unterordnern und den Dateien darin (beliebig tief).
 * Erst im Speicher, dann in der Datenbank. Scheitert der Speicher, bleibt alles erhalten.
 */
export async function deleteMediaItems(supabase: Supabase, bucket: string, selection: MediaItem[]) {
  const allFolders = await loadFolders(supabase)
  const folderIds = [...withDescendants(allFolders, selection.filter((i) => i.isFolder).map((i) => i.id))]

  const files = new Map<string, string>()
  for (const item of selection) if (!item.isFolder) files.set(item.id, item.storage_path)
  for (const ids of chunk(folderIds, 200)) {
    const { data, error } = await supabase.from('media_files').select('id, storage_path').in('folder_id', ids)
    if (error) throw error
    for (const f of data ?? []) files.set(f.id, f.storage_path)
  }

  for (const paths of chunk([...files.values()].filter(Boolean), 100)) {
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) throw new Error(`Dateien konnten im Speicher nicht gelöscht werden (${error.message}). Es wurde nichts entfernt.`)
  }
  for (const ids of chunk([...files.keys()], 200)) {
    const { error } = await supabase.from('media_files').delete().in('id', ids)
    if (error) throw error
  }
  for (const ids of chunk(folderIds, 200)) {
    const { error } = await supabase.from('media_folders').delete().in('id', ids)
    if (error) throw error
  }
  return { fileCount: files.size, folderIds }
}

/** Verschiebt Dateien und Ordner nach `target` (null = Hauptverzeichnis). Ordner nie in sich selbst oder einen Unterordner. */
export async function moveMediaItems(supabase: Supabase, items: MediaItem[], target: string | null) {
  const fileIds = items.filter((i) => !i.isFolder).map((i) => i.id)
  const folderIds = items.filter((i) => i.isFolder).map((i) => i.id)

  // Prüfen mit dem aktuellen Stand der Datenbank (die Datenbank prüft ab v0.16.0 zusätzlich selbst)
  const conflict = moveConflict(folderIds.length ? await loadFolders(supabase) : [], folderIds, target)
  if (conflict) throw new Error(conflict)

  if (fileIds.length > 0) {
    const { error } = await supabase.from('media_files').update({ folder_id: target }).in('id', fileIds)
    if (error) throw error
  }
  if (folderIds.length > 0) {
    const { error } = await supabase.from('media_folders').update({ parent_id: target }).in('id', folderIds)
    if (error) throw error
  }
  return fileIds.length + folderIds.length
}

type StorageFile = { storage_path: string; size: number | null; mime_type: string | null }

/** Alle Dateien im Speicher, seitenweise und rekursiv */
async function listStorage(supabase: Supabase, bucket: string): Promise<StorageFile[]> {
  const result: StorageFile[] = []
  const walk = async (path: string) => {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage.from(bucket).list(path, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw error
      for (const item of data ?? []) {
        if (item.name === '.emptyFolderPlaceholder') continue
        const fullPath = path ? `${path}/${item.name}` : item.name
        if (!item.metadata) await walk(fullPath)
        else result.push({ storage_path: fullPath, size: item.metadata.size ?? null, mime_type: item.metadata.mimetype ?? null })
      }
      if (!data || data.length < PAGE) break
    }
  }
  await walk('')
  return result
}

/** Schon eingetragene Speicherpfade, seitenweise in einem Rutsch statt einer Abfrage je Datei */
async function knownPaths(supabase: Supabase): Promise<Set<string>> {
  const known = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('media_files').select('storage_path').order('storage_path').range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data ?? []) known.add(row.storage_path)
    if (!data || data.length < PAGE) break
  }
  return known
}

/**
 * Abgleich: trägt Dateien, die im Speicher liegen, aber in der Mediathek fehlen, gesammelt ein.
 * Unterordner im Speicher werden zu Ordnern in der Mediathek (fehlende einmal angelegt). Liefert die Anzahl.
 */
export async function syncStorage(supabase: Supabase, bucket: string): Promise<number> {
  const [storageFiles, known, allFolders] = await Promise.all([listStorage(supabase, bucket), knownPaths(supabase), loadFolders(supabase)])
  const fresh = storageFiles.filter((f) => !known.has(f.storage_path))

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
      const { data, error }: { data: { id: string } | null; error: Error | null } = await supabase
        .from('media_folders')
        .insert({ name: parts[i], parent_id: parentId })
        .select('id')
        .single()
      if (error) throw error
      if (!data) throw new Error('Ordner konnte nicht angelegt werden')
      byPath.set(path, data.id)
      parentId = data.id
    }
    return parentId
  }

  const rows = []
  for (const file of fresh) {
    const parts = file.storage_path.split('/')
    const fileName = parts.pop() || file.storage_path
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(file.storage_path)
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
    const { error } = await supabase.from('media_files').insert(part)
    if (error) throw error
    imported += part.length
  }
  return imported
}
