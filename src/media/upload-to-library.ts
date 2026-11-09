// Eine (bereits vorbereitete) Datei in den Storage laden und in der Mediathek
// (media_files) eintragen. Gemeinsam genutzt von Mediathek, ImageUpload und GalleryField.
// Scheitert das Eintragen, wird die Datei wieder gelöscht und der Fehler gemeldet
// (früher blieb sie unsichtbar im Speicher liegen und belegte Platz).

import type { SupabaseClient } from '@supabase/supabase-js'
import { STORAGE_CACHE_CONTROL } from './image-prepare'

// Mediathek-Ordner zum Namen suchen (oberste Ebene bevorzugt, auch Unterordner zählen), sonst anlegen.
// Scheitert das, bleibt die Datei unter „Alle Medien“: Der Upload selbst soll daran nicht scheitern.
async function resolveLibraryFolder(supabase: SupabaseClient, name: string): Promise<string | null> {
  try {
    const { data: found } = await supabase.from('media_folders').select('id, parent_id').ilike('name', name)
    const match = found?.find((f) => f.parent_id === null) ?? found?.[0]
    if (match) return match.id
    const { data: created } = await supabase.from('media_folders').insert({ name, parent_id: null }).select('id').single()
    return created?.id ?? null
  } catch {
    return null
  }
}

export interface UploadToLibraryOptions {
  bucket?: string
  /** Pfad im Storage, z. B. „team“. */
  folder?: string
  /** Name des Mediathek-Ordners. Standard: `folder` mit großem Anfangsbuchstaben, bei „uploads“ kein Ordner. */
  libraryFolder?: string
  /** Ordner der Mediathek direkt per ID (null: Hauptverzeichnis). Hat Vorrang vor libraryFolder. */
  folderId?: string | null
}

export async function uploadToLibrary(
  supabase: SupabaseClient,
  file: File,
  { bucket = 'images', folder = 'uploads', libraryFolder, folderId: fixedFolderId }: UploadToLibraryOptions = {},
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

  let folderId: string | null
  if (fixedFolderId !== undefined) {
    folderId = fixedFolderId
  } else {
    const folderName = libraryFolder ?? (folder === 'uploads' ? '' : folder.charAt(0).toUpperCase() + folder.slice(1))
    folderId = folderName ? await resolveLibraryFolder(supabase, folderName) : null
  }

  const { error: dbError } = await supabase.from('media_files').insert({
    storage_path: filePath,
    display_name: file.name,
    mime_type: file.type,
    size: file.size,
    url: publicUrl,
    folder_id: folderId,
  })
  if (dbError) {
    await supabase.storage.from(bucket).remove([filePath])
    throw dbError
  }

  return publicUrl
}
