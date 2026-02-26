import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import type { NoteViewModel, NoteUpdate } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { parseTagString } from '@ui/web/lib/tags'
import type { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'

type UseNoteSaveHandlersParams = {
  user: { id: string } | null
  isOffline: boolean
  offlineCache: ReturnType<typeof useNoteSync>['offlineCache']
  enqueueMutation: ReturnType<typeof useNoteSync>['enqueueMutation']
  offlineQueueRef: ReturnType<typeof useNoteSync>['offlineQueueRef']
  setOfflineOverlay: ReturnType<typeof useNoteSync>['setOfflineOverlay']
  setPendingCount: ReturnType<typeof useNoteSync>['setPendingCount']
  setFailedCount: ReturnType<typeof useNoteSync>['setFailedCount']
  setLastSavedAt: ReturnType<typeof useNoteSync>['setLastSavedAt']
  createNoteMutation: ReturnType<typeof useCreateNote>
  updateNoteMutation: ReturnType<typeof useUpdateNote>
  deleteNoteMutation: ReturnType<typeof useDeleteNote>
  removeTagMutation: ReturnType<typeof useRemoveTag>
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
  createNoteMutation,
  updateNoteMutation,
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

  /**
   * Shared offline write path: persists note to local cache, upserts the overlay,
   * enqueues the mutation for sync, and increments the pending count.
   * Returns the CachedNote that was saved so callers can update selectedNote.
   */
  const executeOfflineWrite = useCallback(async ({
    operation,
    noteId,
    payload,
    clientUpdatedAt,
  }: OfflineWriteInput): Promise<CachedNote> => {
    const cached: CachedNote = {
      id: noteId,
      title: payload.title ?? 'Untitled',
      description: payload.description,
      tags: payload.tags,
      updatedAt: clientUpdatedAt,
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
    await enqueueMutation({ noteId, operation, payload, clientUpdatedAt })
    setPendingCount((prev) => prev + 1)
    return cached
  }, [offlineCache, setOfflineOverlay, enqueueMutation, setPendingCount])

  const handleAutoSave = useCallback(async (data: { noteId?: string; title?: string; description?: string; tags?: string }) => {
    if (!user) return

    const existingId = data.noteId ?? selectedNoteRef.current?.id
    const isNewNote = !existingId

    // Determine current baseline to diff against (use refs to avoid dependency cycle)
    const current = existingId
      ? (notesRef.current.find(n => n.id === existingId) || selectedNoteRef.current)
      : null
    const nextTitle = data.title ?? current?.title ?? ''
    const nextDescription = data.description ?? current?.description ?? ''
    const nextTags = data.tags ?? (current?.tags?.join(', ') ?? '')

    // For new notes, skip if all fields are empty
    if (isNewNote && !nextTitle.trim() && !nextDescription.trim() && !nextTags.trim()) return

    // Diff check for existing notes: skip if unchanged
    if (!isNewNote) {
      const sameTitle = current?.title === nextTitle
      const sameDesc = (current?.description ?? '') === nextDescription
      const sameTags = (current?.tags ?? []).join(', ') === nextTags
      if (sameTitle && sameDesc && sameTags) return
    }

    setAutoSaving(true)
    const guard = setTimeout(() => setAutoSaving(false), 5000)
    try {
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

        if (isOffline) {
          await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: noteData, clientUpdatedAt })
          setSelectedNote({ id: tempId, title: noteData.title, description: noteData.description, tags: noteData.tags } as NoteViewModel)
        } else {
          const created = await createNoteMutation.mutateAsync(noteData)
          setSelectedNote(created as NoteViewModel)
        }
        setLastSavedAt(clientUpdatedAt)
      } else {
        // Update existing note.
        // Always uses cache + enqueue regardless of isOffline — the sync system handles both cases.
        const targetId = existingId!
        const partialPayload: Partial<NoteUpdate> = {
          title: nextTitle,
          description: nextDescription,
          tags: parsedTags,
        }

        // Optimistic selectedNote update first (prevents stale NoteView after leaving editor)
        setSelectedNote((prev) => {
          if (!prev || prev.id !== targetId) return prev
          return {
            ...prev,
            title: partialPayload.title ?? prev.title,
            description: partialPayload.description ?? (prev.description ?? ''),
            tags: partialPayload.tags ?? prev.tags,
            updated_at: clientUpdatedAt,
          } as NoteViewModel
        })

        await executeOfflineWrite({ operation: 'update', noteId: targetId, payload: partialPayload, clientUpdatedAt })
        setLastSavedAt(clientUpdatedAt)
      }

      // Refresh counts from queue to avoid drift/stuck pending
      const queue = await offlineQueueRef.current.getQueue()
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)
    } finally {
      clearTimeout(guard)
      setAutoSaving(false)
    }
  }, [
    user,
    isOffline,
    executeOfflineWrite,
    offlineQueueRef,
    createNoteMutation,
    setSelectedNote,
    setPendingCount,
    setFailedCount,
    setLastSavedAt,
    notesRef,
    selectedNoteRef,
  ])

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

      if (selectedNote) {
        if (isOffline) {
          await executeOfflineWrite({ operation: 'update', noteId: selectedNote.id, payload: noteData, clientUpdatedAt })
          setSelectedNote({ ...selectedNote, ...noteData })
          toast.success('Saved offline (will sync when online)')
          setLastSavedAt(clientUpdatedAt)
        } else {
          const updated = await updateNoteMutation.mutateAsync({ id: selectedNote.id, ...noteData })
          savedNote = { ...selectedNote, ...updated }
          setLastSavedAt(clientUpdatedAt)
        }
      } else {
        const tempId = uuidv4()
        if (isOffline) {
          await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: { ...noteData, userId: user.id }, clientUpdatedAt })
          setSelectedNote({ id: tempId, ...noteData } as NoteViewModel)
          toast.success('Saved offline (will sync when online)')
          setLastSavedAt(clientUpdatedAt)
        } else {
          const created = await createNoteMutation.mutateAsync({ ...noteData, userId: user.id })
          savedNote = created as NoteViewModel
          setLastSavedAt(clientUpdatedAt)
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

  return {
    saving,
    autoSaving,
    handleAutoSave,
    handleSaveNote,
    handleReadNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
  }
}
