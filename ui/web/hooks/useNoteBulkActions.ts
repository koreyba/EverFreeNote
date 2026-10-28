import { toast } from 'sonner'
import type { NoteViewModel } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { nextMutationTimestamp } from '@core/utils/nextMutationTimestamp'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'
import type { useDeleteNote } from './useNotesMutations'
import type { QueryClient } from '@tanstack/react-query'

export type NotesDeletedHandler = (noteIds: string[]) => void

type UseNoteBulkActionsParams = {
  userId: string | undefined
  selectedNoteIds: Set<string>
  isOffline: boolean
  enqueueBatchAndDrainIfOnline: ReturnType<typeof useNoteSync>['enqueueBatchAndDrainIfOnline']
  offlineQueueRef: ReturnType<typeof useNoteSync>['offlineQueueRef']
  offlineCache: Pick<ReturnType<typeof useNoteSync>['offlineCache'], 'saveNote' | 'deleteNote'>
  setOfflineOverlay: ReturnType<typeof useNoteSync>['setOfflineOverlay']
  setPendingCount: ReturnType<typeof useNoteSync>['setPendingCount']
  deleteNoteMutation: Pick<ReturnType<typeof useDeleteNote>, 'mutateAsync'>
  exitSelectionMode: ReturnType<typeof useNoteSelection>['exitSelectionMode']
  setBulkDeleting: ReturnType<typeof useNoteSelection>['setBulkDeleting']
  /** Receives the IDs that were actually deleted (or queued for deletion offline). */
  onNotesDeleted: NotesDeletedHandler
  beforeDelete?: (noteIds: readonly string[]) => Promise<void>
  queryClient: QueryClient
  notes: NoteViewModel[]
  selectAllVisibleCallback: (source: NoteViewModel[]) => void
}

export type DeleteNotesByIdsResult = {
  total: number
  failed: number
  queuedOffline: boolean
}

/**
 * Owns bulk operations: bulk delete and select-all-visible.
 */
export function useNoteBulkActions({
  userId,
  selectedNoteIds,
  isOffline,
  enqueueBatchAndDrainIfOnline,
  offlineQueueRef,
  offlineCache,
  setOfflineOverlay,
  setPendingCount,
  deleteNoteMutation,
  exitSelectionMode,
  setBulkDeleting,
  onNotesDeleted,
  beforeDelete,
  queryClient,
  notes,
  selectAllVisibleCallback,
}: UseNoteBulkActionsParams) {
  const selectAllVisible = () => {
    selectAllVisibleCallback(notes)
  }

  const deleteNotesByIds = async (ids: string[]): Promise<DeleteNotesByIdsResult> => {
    if (!ids.length) {
      return { total: 0, failed: 0, queuedOffline: false }
    }

    // If any target still has an in-flight save, keep the entire selection
    // intact until it is safe to enqueue or send the deletes.
    await beforeDelete?.(ids)

    try {
      const queue = await offlineQueueRef.current.getQueue()
      const pendingIds = new Set(queue.map((item) => item.noteId))
      const queuedIds = isOffline ? ids : ids.filter((id) => pendingIds.has(id))
      const immediateIds = isOffline ? [] : ids.filter((id) => !pendingIds.has(id))
      const deleted = new Set<string>()
      let failed = 0

      if (queuedIds.length) {
        if (!userId) throw new Error('User not authenticated - deletion skipped')
        const now = nextMutationTimestamp(queue, new Set(queuedIds))
        const updates: CachedNote[] = queuedIds.map((id) => ({
          id,
          user_id: userId,
          status: 'pending' as const,
          deleted: true,
          updatedAt: now,
        }))
        await enqueueBatchAndDrainIfOnline(
          queuedIds.map((id) => ({
            noteId: id,
            operation: 'delete' as const,
            payload: { user_id: userId },
            clientUpdatedAt: now,
          })),
          async () => {
            for (const update of updates) await offlineCache.saveNote(update)
            const queueAfterSave = isOffline ? null : await offlineQueueRef.current.getQueue()
            const pendingAfterSave = new Set(queueAfterSave?.map((item) => item.noteId))
            const alreadySyncedIds = queueAfterSave ? queuedIds.filter((id) => !pendingAfterSave.has(id)) : []
            for (const id of alreadySyncedIds) await offlineCache.deleteNote(id)
            setOfflineOverlay((prev) => {
              const next = prev.filter((item) => !alreadySyncedIds.includes(item.id))
              updates.forEach((update) => {
                if (alreadySyncedIds.includes(update.id)) return
                const idx = next.findIndex((n) => n.id === update.id)
                if (idx >= 0) next[idx] = update
                else next.push(update)
              })
              return next
            })
            queuedIds.forEach((id) => deleted.add(id))
            if (queueAfterSave) setPendingCount(queueAfterSave.filter((item) => item.status === 'pending').length)
            else setPendingCount((prev) => prev + queuedIds.length)
          }
        )
      }

      if (immediateIds.length) {
        const results = await Promise.allSettled(
          immediateIds.map((id) => deleteNoteMutation.mutateAsync({ id, silent: true }))
        )
        failed = results.filter((result) => result.status === 'rejected').length
        const immediateDeleted = immediateIds.filter((_, index) => results[index].status === 'fulfilled')
        for (const id of immediateDeleted) {
          await offlineCache.deleteNote(id)
          deleted.add(id)
        }
        setOfflineOverlay((prev) => prev.filter((note) => !immediateDeleted.includes(note.id)))
      }

      const deletedIds = ids.filter((id) => deleted.has(id))
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} notes`)
      } else if (isOffline) {
        toast.success(`Queued deletion of ${queuedIds.length} notes (offline)`)
      } else if (queuedIds.length) {
        toast.success(`Deletion of ${queuedIds.length} notes queued for sync`)
      } else {
        toast.success(`Deleted ${ids.length} notes`)
      }

      onNotesDeleted(deletedIds)
      // Refreshing the lists can involve slow or unavailable network requests;
      // local deletion and workspace cleanup must not wait for them.
      void Promise.resolve().then(() => Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notes'] }, { throwOnError: true }),
        queryClient.invalidateQueries({ queryKey: ['aiSearch'] }, { throwOnError: true }),
      ])).catch((error) => {
        console.warn('Failed to refresh notes after deletion:', error)
      })

      return { total: ids.length, failed, queuedOffline: isOffline }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete selected notes')
      throw error
    }
  }

  const deleteSelectedNotes = async () => {
    if (!selectedNoteIds.size) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedNoteIds)
      const result = await deleteNotesByIds(ids)
      if (result.failed === 0) {
        exitSelectionMode()
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  return {
    selectAllVisible,
    deleteNotesByIds,
    deleteSelectedNotes,
  }
}
