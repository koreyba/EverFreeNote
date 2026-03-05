import { toast } from 'sonner'
import type { NoteViewModel } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'
import type { useDeleteNote } from './useNotesMutations'
import type { QueryClient } from '@tanstack/react-query'

type UseNoteBulkActionsParams = {
  selectedNoteIds: Set<string>
  isOffline: boolean
  enqueueBatchAndDrainIfOnline: ReturnType<typeof useNoteSync>['enqueueBatchAndDrainIfOnline']
  offlineCache: ReturnType<typeof useNoteSync>['offlineCache']
  setOfflineOverlay: ReturnType<typeof useNoteSync>['setOfflineOverlay']
  setPendingCount: ReturnType<typeof useNoteSync>['setPendingCount']
  deleteNoteMutation: ReturnType<typeof useDeleteNote>
  exitSelectionMode: ReturnType<typeof useNoteSelection>['exitSelectionMode']
  setBulkDeleting: ReturnType<typeof useNoteSelection>['setBulkDeleting']
  setSelectedNote: ReturnType<typeof useNoteSelection>['setSelectedNote']
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
  selectedNoteIds,
  isOffline,
  enqueueBatchAndDrainIfOnline,
  offlineCache,
  setOfflineOverlay,
  setPendingCount,
  deleteNoteMutation,
  exitSelectionMode,
  setBulkDeleting,
  setSelectedNote,
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

    try {
      let failed = 0
      if (isOffline) {
        await enqueueBatchAndDrainIfOnline(
          ids.map((id) => ({
            noteId: id,
            operation: 'delete' as const,
            payload: {},
            clientUpdatedAt: new Date().toISOString(),
          }))
        )
        const now = new Date().toISOString()
        const updates: CachedNote[] = ids.map((id) => ({
          id,
          status: 'pending' as const,
          deleted: true,
          updatedAt: now,
        }))
        for (const update of updates) await offlineCache.saveNote(update)

        setOfflineOverlay((prev) => {
          const next = [...prev]
          updates.forEach((update) => {
            const idx = next.findIndex((n) => n.id === update.id)
            if (idx >= 0) next[idx] = update
            else next.push(update)
          })
          return next
        })
        setPendingCount((prev) => prev + ids.length)
        toast.success(`Queued deletion of ${ids.length} notes (offline)`)
      } else {
        const results = await Promise.allSettled(
          ids.map((id) => deleteNoteMutation.mutateAsync({ id, silent: true }))
        )
        failed = results.filter((r) => r.status === 'rejected').length
        if (failed > 0) {
          toast.error(`Failed to delete ${failed} notes`)
        } else {
          toast.success(`Deleted ${ids.length} notes`)
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notes'] }),
        queryClient.invalidateQueries({ queryKey: ['aiSearch'] }),
      ])
      setSelectedNote(null)

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
      await deleteNotesByIds(ids)
      exitSelectionMode()
    } catch {
      // deleteNotesByIds already reports failures.
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
