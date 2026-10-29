import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { nextMutationTimestamp } from '@core/utils/nextMutationTimestamp'
import type { NoteViewModel, NoteUpdate } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import type { WorkspaceWriteLease } from '@ui/web/providers/WorkspaceMemoryProvider'
import { normalizeTagList, parseTagString } from '@ui/web/lib/tags'
import type { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'
import { enqueueOwnerNoteWrite, waitForOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'
import type { useLocalDeletionRecovery } from './useLocalDeletionRecovery'
import { snapshotEvidence } from '@ui/web/lib/offlineOwnership'

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
  rememberPendingCreate?: (note: NoteViewModel) => void
  beginWorkspaceWrite?: () => WorkspaceWriteLease | undefined
  localDeletion?: Pick<ReturnType<typeof useLocalDeletionRecovery>, 'prepare' | 'complete'>
  onQueueStateNeedsRefresh?: () => void
  isDeleteSessionCurrent?: () => boolean
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
  signal?: AbortSignal
}

function assertWriteNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('The pending save was discarded.', 'AbortError')
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
  rememberPendingCreate,
  beginWorkspaceWrite,
  localDeletion,
  onQueueStateNeedsRefresh,
  isDeleteSessionCurrent,
}: UseNoteSaveHandlersParams) {
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const withWorkspaceWrite = useCallback(async <T,>(work: (signal?: AbortSignal) => Promise<T>): Promise<T> => {
    const lease = beginWorkspaceWrite?.()
    try { return await work(lease?.signal) } finally { lease?.finish() }
  }, [beginWorkspaceWrite])
  
  // Tracks an in-flight note creation (from either auto-save or manual save)
  // so that concurrent saves don't result in duplicate notes.
  const pendingCreatePromiseRef = useRef<Promise<NoteViewModel> | null>(null)
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
  const executeOfflineWrite = useCallback(({ operation, noteId, payload, clientUpdatedAt, signal }: OfflineWriteInput): Promise<CachedNote> => {
    const write = async (): Promise<CachedNote> => {
      assertWriteNotAborted(signal)
      let previousTime = latestWriteTimeByNoteRef.current.get(noteId)
      if (previousTime === undefined) {
        // On a new app session, include pending writes left in durable storage.
        const queue = await offlineQueueRef.current.getQueue()
        previousTime = queue.reduce((latest, item) => {
          const time = Date.parse(item.clientUpdatedAt)
          return item.noteId === noteId && Number.isFinite(time) ? Math.max(latest, time) : latest
        }, 0)
      }
      // Once the local write starts, do not abort between cache and queue writes.
      assertWriteNotAborted(signal)
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

    // Serialize writes for one owner/note even if the UI remounts on an
    // account switch. Other owners and notes proceed independently.
    if (!user?.id) return Promise.reject(new Error('A signed-in account is required to save a note.'))
    const snapshot: CachedNote = {
      id: noteId,
      user_id: user.id,
      title: payload.title ?? 'Untitled',
      description: payload.description,
      tags: payload.tags,
      updatedAt: clientUpdatedAt,
      status: 'pending',
    }
    const current = enqueueOwnerNoteWrite(user.id, noteId, snapshot, write, signal)
    void current.then(
      () => { failedWritesRef.current.delete(noteId) },
      (error: unknown) => { failedWritesRef.current.set(noteId, error) },
    )
    return current
  }, [offlineCache, offlineQueueRef, setOfflineOverlay, enqueueMutation, setPendingCount, user?.id])

  // A manual save can be in flight even when the editor has no pending
  // autosave. Deletion must wait for every write affecting its target notes.
  const waitForPendingNoteWrites = useCallback(async (noteIds: readonly string[]) => {
    await Promise.all(noteIds.map(async (noteId) => {
      if (user?.id) await waitForOwnerNoteWrites(user.id, noteId)
      if (failedWritesRef.current.has(noteId)) throw failedWritesRef.current.get(noteId)
    }))
  }, [user?.id])

  const executeAutoSaveUpdateNote = useCallback(async (
    targetId: string,
    title: string,
    description: string,
    tags: string[],
    clientUpdatedAt: string,
    signal?: AbortSignal
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
    await executeOfflineWrite({ operation: 'update', noteId: targetId, payload: partialPayload, clientUpdatedAt, signal })
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

  const handleAutoSave = useCallback(async (data: { noteId?: string; title?: string; description?: string; tags?: string }) => withWorkspaceWrite(async (signal) => {
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

    assertWriteNotAborted(signal)
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

        const note = {
          id: tempId,
          title: noteData.title,
          description: noteData.description,
          tags: noteData.tags,
          created_at: clientUpdatedAt,
          updated_at: clientUpdatedAt,
          user_id: user.id,
        } as NoteViewModel
        rememberPendingCreate?.(note)
        const createPromise = (async (): Promise<NoteViewModel> => {
          await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: noteData, clientUpdatedAt, signal })
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
        await executeAutoSaveUpdateNote(existingId!, nextTitle, nextDescription, parsedTags, clientUpdatedAt, signal)
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
  }), [
    withWorkspaceWrite,
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
    rememberPendingCreate,
  ])

  const saveExistingNote = useCallback(async (
    currentNote: NoteViewModel,
    noteData: { title: string; description: string; tags: string[] },
    clientUpdatedAt: string,
    signal?: AbortSignal
  ): Promise<NoteViewModel> => {
    await executeOfflineWrite({ operation: 'update', noteId: currentNote.id, payload: noteData, clientUpdatedAt, signal })
    setLastSavedAt(clientUpdatedAt)
    return { ...currentNote, ...noteData, updated_at: clientUpdatedAt }
  }, [executeOfflineWrite, setLastSavedAt])

  const saveNewNote = useCallback(async (
    noteData: { title: string; description: string; tags: string[] },
    userId: string,
    clientUpdatedAt: string,
    signal?: AbortSignal
  ): Promise<NoteViewModel> => {
    const tempId = uuidv4()
    const note = {
      id: tempId,
      ...noteData,
      created_at: clientUpdatedAt,
      updated_at: clientUpdatedAt,
      user_id: userId,
    } as NoteViewModel
    rememberPendingCreate?.(note)
    const createPromise = (async (): Promise<NoteViewModel> => {
      await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: { ...noteData, userId }, clientUpdatedAt, signal })
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
  }, [executeOfflineWrite, syncSelectedNote, setLastSavedAt, rememberPendingCreate])

  const handleSaveNote = async (data: { title: string; description: string; tags: string }) => withWorkspaceWrite(async (signal) => {
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

      // Do not normalize the body when the user only changed title or tags.
      if (currentNote && data.description === (currentNote.description ?? '')) {
        noteData.description = data.description
      }

      assertWriteNotAborted(signal)
      if (currentNote) {
        savedNote = await saveExistingNote(currentNote, noteData, clientUpdatedAt, signal)
      } else {
        savedNote = await saveNewNote(noteData, user.id, clientUpdatedAt, signal)
      }

      if (savedNote) {
        syncSelectedNote(savedNote)
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) console.error('Error saving note:', error)
      throw error
    } finally {
      setSaving(false)
    }
  })

  const handleReadNote = async (data: { title: string; description: string; tags: string }) => {
    const currentNote = selectedNoteRef.current
    const tags = parseTagString(data.tags)
    const currentTags = normalizeTagList(currentNote?.tags ?? [])
    const unchanged = currentNote &&
      data.title === currentNote.title &&
      data.description === (currentNote.description ?? '') &&
      tags.length === currentTags.length &&
      tags.every((tag, index) => tag === currentTags[index])
    if (unchanged) {
      // An equal snapshot can still belong to a write in flight: wait for its
      // durable result before switching modes, and preserve any save failure.
      await waitForPendingNoteWrites([currentNote.id])
    } else {
      await handleSaveNote(data)
    }
    if (!selectedNote) {
      setSelectedNote(null)
    }
    setIsEditing(false)
  }

  const confirmDeleteNote = async (): Promise<boolean> => {
    if (!noteToDelete) return false

    let queuedPath = false
    let serverDeleted = false
    let checkingLocal = false
    try {
      const queue = await offlineQueueRef.current.getQueue()
      const hasQueuedWrites = queue.some((item) => item.noteId === noteToDelete.id)
      if (isOffline || hasQueuedWrites) {
        queuedPath = true
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
        }, async () => {
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
        })
        if (isDeleteSessionCurrent?.() !== false) toast.success(isOffline ? 'Deletion queued offline' : 'Deletion queued for sync')
      } else {
        checkingLocal = Boolean(localDeletion)
        const plan = await localDeletion?.prepare([noteToDelete.id])
        checkingLocal = false
        if (isDeleteSessionCurrent?.() === false) throw new Error('Account changed before deletion.')
        await deleteNoteMutation.mutateAsync({ id: noteToDelete.id, silent: true })
        serverDeleted = true
        let locallyCleaned = true
        if (plan && localDeletion) locallyCleaned = await localDeletion.complete(noteToDelete.id, plan)
        else await offlineCache.deleteNote(noteToDelete.id)
        if (!locallyCleaned) {
          if (isDeleteSessionCurrent?.() !== false) toast.error('Server accepted deletion; local cleanup needs checking.')
          return false
        }
        setOfflineOverlay((prev) => prev.filter((note) => {
          if (note.id !== noteToDelete.id || (note.user_id && note.user_id !== user?.id)) return true
          if (!plan) return false
          const expected = plan.snapshots.get(note.id)
          return !expected || snapshotEvidence(note) !== snapshotEvidence(expected)
        }))
        if (isDeleteSessionCurrent?.() !== false) toast.success('Note deleted successfully')
      }

      if (selectedNote?.id === noteToDelete.id) {
        syncSelectedNote(null)
        setIsEditing(false)
      }
      return true
    } catch (error) {
      console.error('Error deleting note:', error)
      if (isDeleteSessionCurrent?.() === false) return false
      if (queuedPath) {
        onQueueStateNeedsRefresh?.()
        toast.error('Could not finish local deletion. It may already be queued; check sync status.')
      } else if (serverDeleted) {
        toast.error('Server accepted deletion, but the local copy could not be removed. Check local cleanup.')
      } else if (checkingLocal) {
        toast.error('Could not check local data. The deletion was not sent.')
      } else {
        toast.error('Failed to delete note')
      }
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

