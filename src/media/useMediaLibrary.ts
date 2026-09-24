'use client'

// Quelle: template/src/hooks/useMediaLibrary.ts
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../supabase/client'
import { toast } from 'sonner'

interface UseMediaLibraryConfig {
  bucket?: string
  multiSelect?: boolean
}

export function useMediaLibrary({
  bucket = 'images',
  multiSelect = true
}: UseMediaLibraryConfig = {}) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch breadcrumbs for current folder hierarchy
  const fetchBreadcrumbs = useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setFolderBreadcrumbs([])
      return
    }

    try {
      const crumbs: { id: string; name: string }[] = []
      let currentId: string | null = folderId

      while (currentId) {
        const result = await supabase
          .from('media_folders')
          .select('id, name, parent_id')
          .eq('id', currentId)
          .single()

        const data = result.data as { id: string; name: string; parent_id: string | null } | null
        const crumbError = result.error

        if (crumbError || !data) break
        crumbs.unshift({ id: data.id, name: data.name })
        currentId = data.parent_id
      }
      setFolderBreadcrumbs(crumbs)
    } catch (err) {
      console.error('Error fetching breadcrumbs:', err)
    }
  }, [supabase])

  // Fetch items (files and folders) with live search capability
  const fetchItems = useCallback(async (folderId: string | null, search: string = '') => {
    setLoading(true)
    setError(null)

    try {
      if (search.trim().length > 0) {
        // GLOBAL SEARCH across all folders
        const queryTerm = `%${search.trim()}%`
        const [filesRes, foldersRes] = await Promise.all([
          supabase
            .from('media_files')
            .select('id, display_name, storage_path, url, size, mime_type, folder_id')
            .ilike('display_name', queryTerm),
          supabase
            .from('media_folders')
            .select('id, name')
        ])

        if (filesRes.error) throw filesRes.error

        const folderMap = new Map<string, string>()
        if (foldersRes.data) {
          for (const f of foldersRes.data) {
            folderMap.set(f.id, f.name)
          }
        }

        const formattedFiles = (filesRes.data || []).map((f: any) => ({
          id: f.id,
          name: f.display_name,
          url: f.url,
          size: f.size,
          storage_path: f.storage_path,
          mime_type: f.mime_type,
          folder_id: f.folder_id,
          folderName: f.folder_id ? (folderMap.get(f.folder_id) || 'Unterordner') : 'Hauptverzeichnis',
          isFolder: false
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))

        setItems(formattedFiles)
        setSelectedItems([])
        setFolderBreadcrumbs([])
      } else {
        // NORMAL FOLDER BROWSING
        let folderQuery = supabase.from('media_folders').select('id, name, parent_id')
        if (folderId) {
          folderQuery = folderQuery.eq('parent_id', folderId)
        } else {
          folderQuery = folderQuery.is('parent_id', null)
        }
        const { data: dbFolders, error: foldersErr } = await folderQuery

        if (foldersErr) throw foldersErr

        let filesQuery = supabase.from('media_files').select('id, display_name, storage_path, url, size, mime_type, folder_id')
        if (folderId) {
          filesQuery = filesQuery.eq('folder_id', folderId)
        } else {
          filesQuery = filesQuery.is('folder_id', null)
        }
        const { data: dbFiles, error: filesErr } = await filesQuery

        if (filesErr) throw filesErr

        const formattedFolders = (dbFolders || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          isFolder: true
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))

        const formattedFiles = (dbFiles || []).map((f: any) => ({
          id: f.id,
          name: f.display_name,
          url: f.url,
          size: f.size,
          storage_path: f.storage_path,
          mime_type: f.mime_type,
          isFolder: false
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))

        setItems([...formattedFolders, ...formattedFiles])
        setSelectedItems([])
        await fetchBreadcrumbs(folderId)
      }
    } catch (err: any) {
      console.error('Error fetching media items:', err)
      setError(err.message || 'Fehler beim Laden der Medien aus der Datenbank')
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchBreadcrumbs])

  useEffect(() => {
    fetchItems(currentFolderId, searchQuery)
  }, [currentFolderId, searchQuery, fetchItems])

  const navigateTo = (folderId: string) => {
    setSearchQuery('')
    setCurrentFolderId(folderId)
  }

  const navigateToBreadcrumb = (folderId: string | null) => {
    setSearchQuery('')
    setCurrentFolderId(folderId)
  }

  const toggleSelection = (item: any) => {
    if (multiSelect) {
      setSelectedItems(prev =>
        prev.some(i => i.id === item.id)
          ? prev.filter(i => i.id !== item.id)
          : [...prev, item]
      )
    } else {
      setSelectedItems(prev =>
        prev.some(i => i.id === item.id) ? [] : [item]
      )
    }
  }

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const fileList = Array.from(files)
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const fileExt = file.name.split('.').pop()
        const uniqueId = Math.random().toString(36).substring(2, 15)
        const storagePath = `uploads/${uniqueId}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath)

        const { error: dbError } = await supabase
          .from('media_files')
          .insert({
            storage_path: storagePath,
            display_name: file.name,
            url: publicUrl,
            size: file.size,
            mime_type: file.type,
            folder_id: currentFolderId
          })

        if (dbError) throw dbError
      }

      await fetchItems(currentFolderId, searchQuery)
      toast.success(`${fileList.length} Datei(en) erfolgreich hochgeladen`)
    } catch (err: any) {
      console.error('Error uploading:', err)
      setError(err.message || 'Fehler beim Hochladen')
      toast.error(err.message || 'Fehler beim Hochladen')
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (selectedItems.length === 0) return

    setLoading(true)
    const filesToDelete = selectedItems.filter(i => !i.isFolder)
    const foldersToDelete = selectedItems.filter(i => i.isFolder)
    const storagePaths = filesToDelete.map(i => i.storage_path).filter(Boolean)
    const fileIds = filesToDelete.map(i => i.id)
    const folderIds = foldersToDelete.map(i => i.id)

    try {
      if (storagePaths.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(storagePaths)

        if (deleteError) {
          console.warn('Storage deletion notice:', deleteError)
        }
      }

      if (fileIds.length > 0) {
        const { error: dbError } = await supabase
          .from('media_files')
          .delete()
          .in('id', fileIds)

        if (dbError) throw dbError
      }

      if (folderIds.length > 0) {
        const { error: dbError } = await supabase
          .from('media_folders')
          .delete()
          .in('id', folderIds)

        if (dbError) throw dbError
      }

      toast.success(`${selectedItems.length} Element(e) gelöscht`)
      setSelectedItems([])
      await fetchItems(currentFolderId, searchQuery)
    } catch (err: any) {
      console.error('Error deleting:', err)
      setError(err.message || 'Fehler beim Löschen')
      toast.error(err.message || 'Fehler beim Löschen')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async (folderName: string) => {
    if (!folderName) return
    setLoading(true)

    try {
      const { error: dbError } = await supabase
        .from('media_folders')
        .insert({
          name: folderName,
          parent_id: currentFolderId
        })

      if (dbError) throw dbError

      toast.success(`Ordner "${folderName}" erstellt`)
      await fetchItems(currentFolderId, searchQuery)
    } catch (err: any) {
      console.error('Error creating folder:', err)
      setError(err.message || 'Fehler beim Erstellen des Ordners')
      toast.error('Fehler beim Erstellen des Ordners')
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async (newName: string) => {
    if (selectedItems.length !== 1 || !newName) return
    setLoading(true)

    const targetItem = selectedItems[0]

    try {
      if (targetItem.isFolder) {
        const { error: dbError } = await supabase
          .from('media_folders')
          .update({ name: newName })
          .eq('id', targetItem.id)

        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('media_files')
          .update({ display_name: newName })
          .eq('id', targetItem.id)

        if (dbError) throw dbError
      }

      toast.success('Erfolgreich umbenannt')
      setSelectedItems([])
      await fetchItems(currentFolderId, searchQuery)
    } catch (err: any) {
      console.error('Error renaming:', err)
      setError(err.message || 'Fehler beim Umbenennen')
      toast.error('Fehler beim Umbenennen')
    } finally {
      setLoading(false)
    }
  }

  const moveItems = async (itemsToMove: any[], destinationFolderId: string | null) => {
    if (!itemsToMove || itemsToMove.length === 0) return
    setLoading(true)

    const targetFolderId = destinationFolderId === '' ? null : destinationFolderId
    const fileIds = itemsToMove.filter(i => !i.isFolder).map(i => i.id)
    const folderIds = itemsToMove.filter(i => i.isFolder).map(i => i.id)

    try {
      let movedCount = 0

      if (fileIds.length > 0) {
        const { error: dbError } = await supabase
          .from('media_files')
          .update({ folder_id: targetFolderId })
          .in('id', fileIds)

        if (dbError) throw dbError
        movedCount += fileIds.length
      }

      if (folderIds.length > 0) {
        const invalidFolderId = folderIds.find(id => id === targetFolderId)
        if (invalidFolderId) {
          throw new Error('Ordner kann nicht in sich selbst verschoben werden')
        }

        const { error: dbError } = await supabase
          .from('media_folders')
          .update({ parent_id: targetFolderId })
          .in('id', folderIds)

        if (dbError) throw dbError
        movedCount += folderIds.length
      }

      toast.success(`${movedCount} Element(e) verschoben`)
      setSelectedItems([])
      await fetchItems(currentFolderId, searchQuery)
    } catch (err: any) {
      console.error('Error moving items:', err)
      setError(err.message || 'Fehler beim Verschieben')
      toast.error(err.message || 'Fehler beim Verschieben')
    } finally {
      setLoading(false)
    }
  }

  const handleMove = async (destinationFolderId: string) => {
    await moveItems(selectedItems, destinationFolderId)
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)

    try {
      const getStorageFiles = async (path = ''): Promise<any[]> => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(path, { limit: 150 })

        if (error) throw error

        let files: any[] = []
        if (data) {
          for (const item of data) {
            if (item.name === '.emptyFolderPlaceholder') continue

            const fullPath = path ? `${path}/${item.name}` : item.name
            const isFolder = !item.metadata

            if (isFolder) {
              const nested = await getStorageFiles(fullPath)
              files.push(...nested)
            } else {
              files.push({
                storage_path: fullPath,
                name: item.name,
                size: item.metadata?.size,
                mime_type: item.metadata?.mimetype
              })
            }
          }
        }
        return files
      }

      toast.info('Scanne Supabase Storage nach Dateien...')
      const storageFiles = await getStorageFiles('')

      let importedCount = 0
      let folderCache = new Map<string, string | null>()

      const ensureFoldersExist = async (folderParts: string[]): Promise<string | null> => {
        let currentParentId: string | null = null
        let pathAccumulator = ''

        for (const part of folderParts) {
          pathAccumulator = pathAccumulator ? `${pathAccumulator}/${part}` : part

          if (folderCache.has(pathAccumulator)) {
            currentParentId = folderCache.get(pathAccumulator) || null
            continue
          }

          let query = supabase.from('media_folders').select('id').eq('name', part)
          if (currentParentId) {
            query = query.eq('parent_id', currentParentId)
          } else {
            query = query.is('parent_id', null)
          }

          const { data: existingFolder } = await query

          if (existingFolder && existingFolder.length > 0) {
            currentParentId = existingFolder[0].id
          } else {
            const { data: newFolder, error: insertError } = await supabase
              .from('media_folders')
              .insert({ name: part, parent_id: currentParentId })
              .select('id')
              .single()

            if (insertError) throw insertError
            currentParentId = newFolder.id
          }
          folderCache.set(pathAccumulator, currentParentId)
        }
        return currentParentId
      }

      for (const file of storageFiles) {
        const { data: existing } = await supabase
          .from('media_files')
          .select('id')
          .eq('storage_path', file.storage_path)

        if (existing && existing.length > 0) continue

        const pathParts = file.storage_path.split('/')
        const fileName = pathParts.pop() || file.name
        const folderParts = pathParts

        const folderId = folderParts.length > 0 ? await ensureFoldersExist(folderParts) : null

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(file.storage_path)

        const { error: insertErr } = await supabase
          .from('media_files')
          .insert({
            storage_path: file.storage_path,
            display_name: fileName,
            url: publicUrl,
            size: file.size,
            mime_type: file.mime_type,
            folder_id: folderId
          })

        if (!insertErr) {
          importedCount++
        }
      }

      toast.success(`${importedCount} neue Datei(en) erfolgreich synchronisiert!`)
      await fetchItems(currentFolderId, searchQuery)
    } catch (err: any) {
      console.error('Error syncing storage details:', err)
      setError(err.message || 'Fehler beim Synchronisieren des Cloud-Speichers')
      toast.error(`Fehler: ${err.message || 'Details in der Konsole'}`)
    } finally {
      setSyncing(false)
    }
  }

  return {
    currentFolderId,
    folderBreadcrumbs,
    searchQuery,
    setSearchQuery,
    items,
    loading,
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
    confirmDelete,
    handleCreateFolder,
    handleRename,
    handleMove,
    moveItems,
    handleSync,
    refetch: () => fetchItems(currentFolderId, searchQuery)
  }
}
