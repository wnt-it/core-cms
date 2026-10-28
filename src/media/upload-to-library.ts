// Eine (bereits vorbereitete) Datei in den Storage laden und in der Mediathek
// (media_files) eintragen. Gemeinsam genutzt von ImageUpload und GalleryField.

import type { SupabaseClient } from '@supabase/supabase-js'
import { STORAGE_CACHE_CONTROL } from './image-prepare'

export async function uploadToLibrary(
  supabase: SupabaseClient,
  file: File,
  { bucket = 'images', folder = 'uploads' }: { bucket?: string; folder?: string } = {},
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

  await supabase.from('media_files').insert({
    storage_path: filePath,
    display_name: file.name,
    mime_type: file.type,
    size: file.size,
    url: publicUrl,
    folder_id: null,
  })

  return publicUrl
}
