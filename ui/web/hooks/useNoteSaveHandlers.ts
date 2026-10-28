import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { nextMutationTimestamp } from '@core/utils/nextMutationTimestamp'
import type { NoteViewModel, NoteUpdate } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { parseTagString } from '@ui/web/lib/tags'
import type { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'

type UseNoteSaveHandlersParams = {
  user: { id: string } | null
  isOffline: boolean
  offlineCache: Pick<ReturnType<typeof useNoteSync>['offlineCache'], 'saveNote' | 'deleteNote'>
  enqueueMutation: ReturnType<typeof useNoteSync>['enqueueMutation']
  offlineQueueRef: {
    current: Pick<ReturnType<typeof useNoteSync>['offlineQueueRef']['current'], 'getQueue'>
  }
  setOfflineOverlay: ReturnType<typeof useNoteSync>['setOfflineOverlay']
  setPendingCount: ReturnType<typeof useNoteSync>['setPendingCount']
  setFailedCount: ReturnType<typeof useNoteSync>['setFailedCount']
  setLastSavedAt: ReturnType<typeof useNoteSync>['setLastSavedAt']
  createNoteMutation: Pick<ReturnType<typeof useCreateNote>, 'mutateAsync'>
  updateNoteMutation: Pick<ReturnType<typeof useUpdateNote>, 'mutateAsync'>
  deleteNoteMutation: Pick<ReturnType<typeof useDeleteNote>, 'mutateAsync'>
  removeTagMutation: Pick<ReturnType<typeof useRemoveTag>, 'mutateAsync'>
  selectedNote: NoteViewModel | null
  setSelectedNote: ReturnType<typeof useNoteSelection>['setSelectedNote']
  setIsEditing: ReturnType<typeof useNoteSelection>['setIsEditing']
  noteToDelete: NoteViewModel | null
  setDeleteDialogOpen: ReturnType<typeof useNoteSelection>['setDeleteDialogOpen']
  setNoteToDelete: ReturnType<typeof useNoteSelection>['setNoteToDelete']
  notes: NoteViewModel[]
  notesRef: React.MutableRefObject<NoteViewModel[]>
  selectedNoteRef: React.MutableRefObject<NoteViewModel | null>
}

type OfflineWriteInput = {
  operation: 'create' | 'update'
  noteId: string
  payload: {
    title?: string
    description?: string
    tags?: string[]
    userId?: string
  }
  clientUpdatedAt: string
}

/**
 * Owns all write operations: auto-save, manual save, read-mode transition,
 * single-note delete, and tag removal.
 */
export function useNoteSaveHandlers({
  user,
  isOffline,
  offlineCache,
  enqueueMutation,
  offlineQueueRef,
  setOfflineOverlay,
  setPendingCount,
  setFailedCount,
  setLastSavedAt,
  deleteNoteMutation,
  removeTagMutation,
  selectedNote,
  setSelectedNote,
  setIsEditing,
  noteToDelete,
  setDeleteDialogOpen,
  setNoteToDelete,
  notes,
  notesRef,
  selectedNoteRef,
}: UseNoteSaveHandlersParams) {
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  
  // Tracks an in-flight note creation (from either auto-save or manual save)
  // so that concurrent saves don't result in duplicate notes.
  const pendingCreatePromiseRef = useRef<Promise<NoteViewModel> | null>(null)
  const pendingWritesByNoteRef = useRef(new Map<string, Promise<void>>())
  const pendingWriteResultsRef = useRef(new Map<string, Promise<CachedNote>>())
  const failedWritesRef = useRef(new Map<string, unknown>())
  const latestWriteTimeByNoteRef = useRef(new Map<string, number>())

  const syncSelectedNote = useCallback((note: NoteViewModel | null | ((prev: NoteViewModel | null) => NoteViewModel | null)) => {
    setSelectedNote((prev) => {
      const next = typeof note === 'function'
        ? (note as (current: NoteViewModel | null) => NoteViewModel | null)(prev)
        : note
      selectedNoteRef.current = next
      return next
    })
  }, [selectedNoteRef, setSelectedNote])

  /**
   * Shared durable write path (connectivity never gates local saves): persists note to local cache, upserts the overlay,
   * enqueues the mutation for sync, and increments the pending count.
   * Returns the CachedNote that was saved so callers can update selectedNote.
   */
  const executeOfflineWrite = useCallback(({ operation, noteId, payload, clientUpdatedAt }: OfflineWriteInput): Promise<CachedNote> => {
    const write = async (): Promise<CachedNote> => {
      let previousTime = latestWriteTimeByNoteRef.current.get(noteId)
      if (previousTime === undefined) {
        // On a new app session, include pending writes left in durable storage.
        const queue = await offlineQueueRef.current.getQueue()
        previousTime = queue.reduce((latest, item) => {
          const time = Date.parse(item.clientUpdatedAt)
          return item.noteId === noteId && Number.isFinite(time) ? Math.max(latest, time) : latest
        }, 0)
      }
      const writeTime = Math.max(Date.parse(clientUpdatedAt), previousTime + 1)
      latestWriteTimeByNoteRef.current.set(noteId, writeTime)
      const durableUpdatedAt = new Date(writeTime).toISOString()
      const cached: CachedNote = {
        id: noteId,
        user_id: user?.id,
        title: payload.title ?? 'Untitled',
        description: payload.description,
        tags: payload.tags,
        updatedAt: durableUpdatedAt,
        status: 'pending',
      }
      await offlineCache.saveNote(cached)
      setOfflineOverlay((prev) => {
        const idx = prev.findIndex((n) => n.id === noteId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...cached }
          return next
        }
        return [...prev, cached]
      })
      await enqueueMutation({ noteId, operation, payload: { ...payload, user_id: user?.id }, clientUpdatedAt: durableUpdatedAt })
      setPendingCount((prev) => prev + 1)
      return cached
    }

    // A manual save and an autosave can overlap. Preserve their order for the
    // same note through both cache and queue writes; unrelated notes remain independent.
    const previous = pendingWritesByNoteRef.current.get(noteId)
    const current = previous ? previous.then(write) : write()
    const settled = current.then(() => undefined, () => undefined)
    pendingWritesByNoteRef.current.set(noteId, settled)
    pendingWriteResultsRef.current.set(noteId, current)
    void current.then(
      () => { failedWritesRef.current.delete(noteId) },
      (error: unknown) => { failedWritesRef.current.set(noteId, error) },
    )
    void settled.then(() => {
      if (pendingWritesByNoteRef.current.get(noteId) === settled) pendingWritesByNoteRef.current.delete(noteId)
      if (pendingWriteResultsRef.current.get(noteId) === current) pendingWriteResultsRef.current.delete(noteId)
    })
    return current
  }, [offlineCache, offlineQueueRef, setOfflineOverlay, enqueueMutation, setPendingCount, user?.id])

  // A manual save can be in flight even when the editor has no pending
  // autosave. Deletion must wait for every write affecting its target notes.
  const waitForPendingNoteWrites = useCallback(async (noteIds: readonly string[]) => {
    await Promise.all(noteIds.map(async (noteId) => {
      let pending = pendingWriteResultsRef.current.get(noteId)
      while (pending) {
        await pending
        const latest = pendingWriteResultsRef.current.get(noteId)
        if (latest === pending) break
        pending = latest
      }
      if (failedWritesRef.current.has(noteId)) throw failedWritesRef.current.get(noteId)
    }))
  }, [])

  const executeAutoSaveUpdateNote = useCallback(async (
    targetId: string,
    title: string,
    description: string,
    tags: string[],
    clientUpdatedAt: string
  ): Promise<void> => {
    const partialPayload: Partial<NoteUpdate> = { title, description, tags }
    syncSelectedNote((prev) => {
      if (prev?.id !== targetId) return prev
      return {
        ...prev,
        title: partialPayload.title ?? prev.title,
        description: partialPayload.description ?? (prev.description ?? ''),
        tags: partialPayload.tags ?? prev.tags,
        updated_at: clientUpdatedAt,
      } as NoteViewModel
    })
    await executeOfflineWrite({ operation: 'update', noteId: targetId, payload: partialPayload, clientUpdatedAt })
  }, [syncSelectedNote, executeOfflineWrite])

  const persistOfflineNoteUpdates = useCallback(async (updatedNotes: NoteViewModel[]) => {
    const clientUpdatedAt = new Date().toISOString()

    await Promise.all(updatedNotes.map((note) => executeOfflineWrite({
      operation: 'update',
      noteId: note.id,
      payload: {
        title: note.title,
        description: note.description,
        tags: note.tags,
      },
      clientUpdatedAt,
    })))

    const queue = await offlineQueueRef.current.getQueue()
    setPendingCount(queue.filter((item) => item.status === 'pending').length)
    setFailedCount(queue.filter((item) => item.status === 'failed').length)
  }, [executeOfflineWrite, offlineQueueRef, setFailedCount, setPendingCount])

  const handleAutoSave = useCallback(async (data: { noteId?: string; title?: string; description?: string; tags?: string }) => {
    if (!user) return

    let existingId = data.noteId ?? selectedNoteRef.current?.id

    if (!existingId && pendingCreatePromiseRef.current) {
      try {
        const currentNote = await pendingCreatePromiseRef.current
        existingId = currentNote.id
      } catch {
        // If creation failed, we proceed to create it ourselves
      }
    }

    const isNewNote = !existingId

    const current = existingId
      ? (notesRef.current.find(n => n.id === existingId) ?? selectedNoteRef.current)
      : null
    const nextTitle = data.title ?? current?.title ?? ''
    const nextDescription = data.description ?? current?.description ?? ''
    const nextTags = data.tags ?? (current?.tags?.join(', ') ?? '')

    if (isNewNote && !nextTitle.trim() && !nextDescription.trim() && !nextTags.trim()) return

    setAutoSaving(true)
    const guard = setTimeout(() => setAutoSaving(false), 5000)
    try {
      let assignedNoteId: string | undefined
      const clientUpdatedAt = new Date().toISOString()
      const parsedTags = parseTagString(nextTags)

      if (isNewNote) {
        const tempId = uuidv4()
        const noteData = {
          title: nextTitle.trim() || 'Untitled',
          description: nextDescription.trim(),
          tags: parsedTags,
          userId: user.id,
        }

        const createPromise = (async (): Promise<NoteViewModel> => {
          await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: noteData, clientUpdatedAt })
          const note = {
            id: tempId,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
            created_at: clientUpdatedAt,
            updated_at: clientUpdatedAt,
            user_id: user.id,
          } as NoteViewModel
          syncSelectedNote(note)
          return note
        })()

        pendingCreatePromiseRef.current = createPromise
        try {
          const created = await createPromise
          assignedNoteId = created.id
        } finally {
          pendingCreatePromiseRef.current = null
        }
        setLastSavedAt(clientUpdatedAt)
      } else {
        await executeAutoSaveUpdateNote(existingId!, nextTitle, nextDescription, parsedTags, clientUpdatedAt)
        setLastSavedAt(clientUpdatedAt)
      }

      const queue = await offlineQueueRef.current.getQueue()
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)

      if (assignedNoteId) {
        return { noteId: assignedNoteId }
      }
    } finally {
      clearTimeout(guard)
      setAutoSaving(false)
    }
  }, [
    user,
    executeOfflineWrite,
    syncSelectedNote,
    executeAutoSaveUpdateNote,
    offlineQueueRef,
    setPendingCount,
    setFailedCount,
    setLastSavedAt,
    notesRef,
    selectedNoteRef,
  ])

  const saveExistingNote = useCallback(async (
    currentNote: NoteViewModel,
    noteData: { title: string; description: string; tags: string[] },
    clientUpdatedAt: string
  ): Promise<NoteViewModel> => {
    await executeOfflineWrite({ operation: 'update', noteId: currentNote.id, payload: noteData, clientUpdatedAt })
    setLastSavedAt(clientUpdatedAt)
    return { ...currentNote, ...noteData, updated_at: clientUpdatedAt }
  }, [executeOfflineWrite, setLastSavedAt])

  const saveNewNote = useCallback(async (
    noteData: { title: string; description: string; tags: string[] },
    userId: string,
    clientUpdatedAt: string
  ): Promise<NoteViewModel> => {
    const tempId = uuidv4()
    const createPromise = (async (): Promise<NoteViewModel> => {
      await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: { ...noteData, userId }, clientUpdatedAt })
      const note = {
        id: tempId,
        ...noteData,
        created_at: clientUpdatedAt,
        updated_at: clientUpdatedAt,
        user_id: userId,
      } as NoteViewModel
      syncSelectedNote(note)
      return note
    })()

    pendingCreatePromiseRef.current = createPromise
    try {
      const saved = await createPromise
      setLastSavedAt(clientUpdatedAt)
      return saved
    } finally {
      pendingCreatePromiseRef.current = null
    }
  }, [executeOfflineWrite, syncSelectedNote, setLastSavedAt])

  const handleSaveNote = async (data: { title: string; description: string; tags: string }) => {
    if (!user) return

    setSaving(true)
    try {
      let savedNote: NoteViewModel | null = null
      const tags = parseTagString(data.tags)
      const clientUpdatedAt = new Date().toISOString()
      const noteData = {
        title: data.title.trim() || 'Untitled',
        description: data.description.trim(),
        tags,
      }

      let currentNote = selectedNoteRef.current

      if (!currentNote && pendingCreatePromiseRef.current) {
        try {
          currentNote = await pendingCreatePromiseRef.current
        } catch {
          // If creation failed, we proceed to create it ourselves
        }
      }

      if (currentNote) {
        savedNote = await saveExistingNote(currentNote, noteData, clientUpdatedAt)
      } else {
        savedNote = await saveNewNote(noteData, user.id, clientUpdatedAt)
      }

      if (savedNote) {
        syncSelectedNote(savedNote)
      }
    } catch (error) {
      console.error('Error saving note:', error)
      throw error
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

  const confirmDeleteNote = async (): Promise<boolean> => {
    if (!noteToDelete) return false

    try {
      const queue = await offlineQueueRef.current.getQueue()
      const hasQueuedWrites = queue.some((item) => item.noteId === noteToDelete.id)
      if (isOffline || hasQueuedWrites) {
        if (!user?.id) throw new Error('User not authenticated - deletion skipped')
        const deletedAt = nextMutationTimestamp(queue, new Set([noteToDelete.id]))
        const cachedDelete: CachedNote = {
          id: noteToDelete.id,
          user_id: user.id,
          status: 'pending',
          deleted: true,
          updatedAt: deletedAt,
        }
        await enqueueMutation({
          noteId: noteToDelete.id,
          operation: 'delete',
          payload: { user_id: user.id },
          clientUpdatedAt: deletedAt,
        })
        await offlineCache.saveNote(cachedDelete)
        const queueAfterSave = isOffline ? null : await offlineQueueRef.current.getQueue()
        const alreadySynced = queueAfterSave !== null && !queueAfterSave.some((item) => item.noteId === noteToDelete.id)
        if (alreadySynced) await offlineCache.deleteNote(noteToDelete.id)
        setOfflineOverlay((prev) => {
          if (alreadySynced) return prev.filter((note) => note.id !== noteToDelete.id)
          const idx = prev.findIndex((n) => n.id === noteToDelete.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = cachedDelete
            return next
          }
          return [...prev, cachedDelete]
        })
        if (queueAfterSave) setPendingCount(queueAfterSave.filter((item) => item.status === 'pending').length)
        else setPendingCount((prev) => prev + 1)
        toast.success(isOffline ? 'Deletion queued offline' : 'Deletion queued for sync')
      } else {
        await deleteNoteMutation.mutateAsync({ id: noteToDelete.id })
        await offlineCache.deleteNote(noteToDelete.id)
        setOfflineOverlay((prev) => prev.filter((note) => note.id !== noteToDelete.id))
      }

      if (selectedNote?.id === noteToDelete.id) {
        syncSelectedNote(null)
        setIsEditing(false)
      }
      return true
    } catch (error) {
      console.error('Error deleting note:', error)
      return false
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const handleRemoveTagFromNote = async (noteId: string, tagToRemove: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate?.tags) return

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

  return {
    saving,
    autoSaving,
    handleAutoSave,
    handleSaveNote,
    handleReadNote,
    confirmDeleteNote,
    waitForPendingNoteWrites,
    handleRemoveTagFromNote,
    persistOfflineNoteUpdates,
  }
}

