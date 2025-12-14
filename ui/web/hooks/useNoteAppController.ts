import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useNotesQuery, useFlattenedNotes } from './useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { NoteViewModel, NoteInsert, NoteUpdate } from '@core/types/domain'
import { useNoteAuth } from './useNoteAuth'
import { useNoteSearch } from './useNoteSearch'
import { useNoteSelection } from './useNoteSelection'
import { useNoteSync } from './useNoteSync'
import type { MutationQueueItemInput, CachedNote } from '@core/types/offline'
import { v4 as uuidv4 } from 'uuid'
import { applyNoteOverlay } from '@core/utils/overlay'

export type EditFormState = {
  title: string
  description: string
  tags: string
}

type NotePayload = (Partial<NoteInsert> & { userId?: string }) | Partial<NoteUpdate>

export function useNoteAppController() {
  // -- Sub-hooks --
  const {
    user,
    loading: authLoadingState,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut,
    handleDeleteAccount,
    deleteAccountLoading
  } = useNoteAuth()

  // -- Selection State --
  const {
    selectedNote,
    setSelectedNote,
    isEditing,
    setIsEditing,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    setNoteToDelete,
    selectedNoteIds,
    selectionMode,
    bulkDeleting,
    setBulkDeleting,
    handleSelectNote,
    handleSearchResultClick,
    handleEditNote,
    handleCreateNote,
    handleDeleteNote,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible: selectAllVisibleCallback,
    clearSelection,
  } = useNoteSelection()

  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)


  // -- Dependencies --
  const queryClient = useQueryClient()

  // -- Mutations (needed for sync manager) --
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  // -- Sync & Offline --
  const {
    offlineOverlay,
    setOfflineOverlay,
    pendingCount,
    setPendingCount,
    failedCount,
    setFailedCount,
    isOffline,
    lastSavedAt,
    setLastSavedAt,
    offlineCache,
    enqueueMutation,
    enqueueBatchAndDrainIfOnline,
    offlineQueueRef
  } = useNoteSync({
    user,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation
  })

  // Combine provider loading with local auth loading
  const combinedLoading = authLoadingState

  // -- Queries --
  const {
    searchQuery,
    filterByTag,
    handleSearch,
    handleTagClick: onTagClick,
    handleClearTagFilter,
    showFTSResults,
    aggregatedFtsData,
    ftsObserverTarget,
    ftsHasMore,
    ftsLoadingMore,
    ftsAccumulatedResults,
    loadMoreFts,
    ftsSearchResult
  } = useNoteSearch(user?.id)

  // Re-establishing the notes query with the search params from useNoteSearch
  const notesQuery = useNotesQuery({
    userId: user?.id,
    searchQuery,
    selectedTag: filterByTag,
    enabled: !!user,
  })

  const baseNotes: NoteViewModel[] = useFlattenedNotes(notesQuery)

  const notes: NoteViewModel[] = useMemo(() => {
    if (!offlineOverlay.length) return baseNotes
    return applyNoteOverlay(baseNotes, offlineOverlay) as NoteViewModel[]
  }, [baseNotes, offlineOverlay])

  // Total count of notes
  const totalNotes = useMemo(() => {
    const pages = notesQuery.data?.pages
    if (pages?.length) {
      const total = pages[0]?.totalCount
      if (typeof total === 'number') return total
    }
    return notes.length
  }, [notesQuery.data?.pages, notes.length]) ?? 0

  const notesDisplayed = showFTSResults && aggregatedFtsData ? aggregatedFtsData.results.length : notes.length
  const baseTotal = showFTSResults && aggregatedFtsData ? aggregatedFtsData.total : totalNotes
  const notesTotal = baseTotal
  const selectedCount = selectedNoteIds.size

  // -- Infinite Scroll --
  const observerTarget = useInfiniteScroll(
    notesQuery.fetchNextPage,
    notesQuery.hasNextPage,
    notesQuery.isFetchingNextPage,
    { threshold: 0.8, rootMargin: '200px' }
  )

  // Refs to avoid dependency cycles in handleAutoSave
  const notesRef = useRef(notes)
  const selectedNoteRef = useRef(selectedNote)
  useEffect(() => {
    notesRef.current = notes
    selectedNoteRef.current = selectedNote
  }, [notes, selectedNote])

  const handleTagClick = useCallback((tag: string) => {
    onTagClick(tag)
    setSelectedNote(null)
    setIsEditing(false)
  }, [onTagClick, setSelectedNote, setIsEditing])

  const handleAutoSave = useCallback(async (data: { noteId?: string; title?: string; description?: string; tags?: string }) => {
    if (!user) return
    const targetId = data.noteId ?? selectedNoteRef.current?.id
    if (!targetId) return

    // Determine current baseline to diff against (use refs to avoid dependency cycle)
    const current = notesRef.current.find(n => n.id === targetId) || selectedNoteRef.current
    const nextTitle = data.title ?? current?.title ?? ''
    const nextDescription = data.description ?? current?.description ?? ''
    const nextTags = data.tags ?? (current?.tags?.join(', ') ?? '')

    // Diff check: skip if unchanged
    const sameTitle = current?.title === nextTitle
    const sameDesc = (current?.description ?? '') === nextDescription
    const sameTags = (current?.tags ?? []).join(', ') === nextTags
    if (sameTitle && sameDesc && sameTags) return

    setAutoSaving(true)
    const guard = setTimeout(() => setAutoSaving(false), 5000)
    try {
      const clientUpdatedAt = new Date().toISOString()
      const partialPayload: Partial<NoteUpdate> = {
        title: nextTitle,
        description: nextDescription,
        tags: nextTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }

      // Update offline cache + overlay immediately
      const cached: CachedNote = {
        id: targetId,
        title: partialPayload.title,
        description: partialPayload.description,
        tags: partialPayload.tags,
        updatedAt: clientUpdatedAt,
        status: 'pending',
      }

      await offlineCache.saveNote(cached)
      setOfflineOverlay((prev) => {
        const idx = prev.findIndex((n) => n.id === targetId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...cached }
          return next
        }
        return [...prev, cached]
      })

      // Fire-and-forget enqueue to avoid blocking UI/autosave spinner on network/sync work
      await enqueueMutation({
        noteId: targetId,
        operation: 'update',
        payload: partialPayload,
        clientUpdatedAt,
      })
      // Refresh counts from queue to avoid drift/stuck pending
      const queue = await offlineQueueRef.current.getQueue()
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)
      setLastSavedAt(clientUpdatedAt)
    } finally {
      clearTimeout(guard)
      setAutoSaving(false)
    }
  }, [
    user,
    offlineCache,
    enqueueMutation,
    offlineQueueRef,
    setPendingCount,
    setFailedCount,
    setLastSavedAt,
    setOfflineOverlay
  ])

  const handleSaveNote = async (data: { title: string; description: string; tags: string }) => {
    if (!user) return

    const offlineMutation = async (
      operation: MutationQueueItemInput['operation'],
      noteId: string,
      payload: NotePayload,
      baseNote?: NoteViewModel | null
    ) => {
      const item: MutationQueueItemInput = {
        noteId,
        operation,
        payload,
        clientUpdatedAt: new Date().toISOString(),
      }
      await enqueueMutation(item)
      // Сохраняем локальный кеш для overlay (офлайн отображение)
      const nowIso = new Date().toISOString()
      const createdIso =
        (baseNote as { created_at?: string } | undefined)?.created_at ??
        (baseNote as { createdAt?: string } | undefined)?.createdAt ??
        nowIso
      const cached: CachedNote = {
        id: noteId,
        title: payload.title ?? 'Untitled',
        description: 'description' in payload ? payload.description : undefined,
        tags: 'tags' in payload ? payload.tags : undefined,
        content: 'description' in payload ? payload.description : undefined,
        status: 'pending',
        updatedAt: nowIso,
        // created_at/updated_at нужны для корректных дат в офлайн-UI
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        created_at: createdIso,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        updated_at: nowIso,
      }
      await offlineCache.saveNote(cached)
      // Optimized: update local state instead of reloading from DB
      setOfflineOverlay((prev) => {
        const idx = prev.findIndex((n) => n.id === noteId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = cached
          return next
        }
        return [...prev, cached]
      })
      // Optimized: increment pending count
      setPendingCount((prev) => prev + 1)
    }

    setSaving(true)
    try {
      let savedNote: NoteViewModel | null = null
      const tags = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const noteData = {
        title: data.title.trim() || 'Untitled',
        description: data.description.trim(),
        tags,
      }

      if (selectedNote) {
        if (isOffline) {
          await offlineMutation('update', selectedNote.id, noteData, selectedNote)
          // Оптимистичное обновление выбранной заметки
          setSelectedNote({
            ...selectedNote,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
          })
          toast.success('Saved offline (will sync when online)')
          setLastSavedAt(new Date().toISOString())
        } else {
          const updated = await updateNoteMutation.mutateAsync({
            id: selectedNote.id,
            ...noteData,
          })
          savedNote = { ...selectedNote, ...updated }
          setLastSavedAt(new Date().toISOString())
        }
      } else {
        const tempId = uuidv4()
        if (isOffline) {
          await offlineMutation('create', tempId, { ...noteData, userId: user.id }, null)
          setSelectedNote({
            id: tempId,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
          } as NoteViewModel)
          toast.success('Saved offline (will sync when online)')
          setLastSavedAt(new Date().toISOString())
        } else {
          const created = await createNoteMutation.mutateAsync({
            ...noteData,
            userId: user.id,
          })
          savedNote = created as NoteViewModel
          setLastSavedAt(new Date().toISOString())
        }
      }

      if (savedNote) {
        setSelectedNote(savedNote)
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReadNote = async (data: { title: string; description: string; tags: string }) => {
    await handleSaveNote(data)
    if (!selectedNote) {
      setSelectedNote(null)
    }
    setIsEditing(false)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    try {
      if (isOffline) {
        await enqueueMutation({
          noteId: noteToDelete.id,
          operation: 'delete',
          payload: {},
          clientUpdatedAt: new Date().toISOString(),
        })
        // Удаляем из кеша, чтобы карточка не дублировалась офлайн
        const cachedDelete: CachedNote = {
          id: noteToDelete.id,
          status: 'pending',
          deleted: true,
          updatedAt: new Date().toISOString(),
        }
        await offlineCache.saveNote(cachedDelete)

        setOfflineOverlay((prev) => {
          const idx = prev.findIndex((n) => n.id === noteToDelete.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = cachedDelete
            return next
          }
          return [...prev, cachedDelete]
        })
        setPendingCount((prev) => prev + 1)
        toast.success('Deletion queued offline')
      } else {
        await deleteNoteMutation.mutateAsync({ id: noteToDelete.id })
      }

      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const handleRemoveTagFromNote = async (noteId: string, tagToRemove: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate || !noteToUpdate.tags) return

      const updatedTags = noteToUpdate.tags.filter(tag => tag !== tagToRemove)
      await removeTagMutation.mutateAsync({ noteId, updatedTags })

      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const selectAllVisible = () => {
    const source = showFTSResults && aggregatedFtsData
      ? aggregatedFtsData.results
      : notes
    selectAllVisibleCallback(source)
  }


  const deleteSelectedNotes = async () => {
    if (!selectedNoteIds.size) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedNoteIds)
      if (isOffline) {
        await enqueueBatchAndDrainIfOnline(
          ids.map((id) => ({
            noteId: id,
            operation: 'delete',
            payload: {},
            clientUpdatedAt: new Date().toISOString(),
          }))
        )
        // Mark all as deleted for optimistic UI
        const now = new Date().toISOString()
        const updates: CachedNote[] = []
        for (const id of ids) {
          const cached: CachedNote = {
            id,
            status: 'pending',
            deleted: true,
            updatedAt: now,
          }
          await offlineCache.saveNote(cached)
          updates.push(cached)
        }

        setOfflineOverlay((prev) => {
          const next = [...prev]
          updates.forEach((u) => {
            const idx = next.findIndex((n) => n.id === u.id)
            if (idx >= 0) next[idx] = u
            else next.push(u)
          })
          return next
        })
        setPendingCount((prev) => prev + ids.length)
        toast.success(`Queued deletion of ${ids.length} notes (offline)`)
      } else {
        const results = await Promise.allSettled(ids.map(id => deleteNoteMutation.mutateAsync({ id, silent: true })))
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) {
          toast.error(`Failed to delete ${failed} notes`)
        } else {
          toast.success(`Deleted ${ids.length} notes`)
        }
      }
      exitSelectionMode()
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete selected notes')
    } finally {
      setBulkDeleting(false)
    }
  }

  return {
    // State
    user,
    loading: combinedLoading,
    selectedNote,
    searchQuery,
    isEditing,
    setIsEditing,
    saving,
    filterByTag,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    selectionMode,
    selectedNoteIds,
    selectedCount,
    bulkDeleting,
    deleteAccountLoading,
    isOffline,

    // Data
    notes,
    notesQuery,
    ftsSearchResult,
    ftsData: aggregatedFtsData,
    ftsResults: ftsAccumulatedResults,
    ftsHasMore,
    ftsLoadingMore,
    showFTSResults,
    observerTarget,
    ftsObserverTarget,
    totalNotes: notesTotal,
    notesDisplayed,
    notesTotal,
    pendingCount,
    failedCount,
    lastSavedAt,
    autoSaving,

    // Handlers
    handleSearch,
    handleTagClick,
    handleClearTagFilter,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut,
    handleDeleteAccount,
    handleCreateNote,
    handleEditNote,
    handleSaveNote,
    handleReadNote,
    handleAutoSave,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote,
    handleSearchResultClick,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible,
    clearSelection,
    loadMoreFts,
    deleteSelectedNotes,

    // Helpers
    invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  }
}

export type NoteAppController = ReturnType<typeof useNoteAppController>
