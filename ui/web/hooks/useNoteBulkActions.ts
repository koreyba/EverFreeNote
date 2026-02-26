import { toast } from 'sonner'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import type { useNoteSync } from './useNoteSync'
import type { useNoteSelection } from './useNoteSelection'
import type { useDeleteNote } from './useNotesMutations'
import type { QueryClient } from '@tanstack/react-query'
import type { useNoteData } from './useNoteData'

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
  showFTSResults: boolean
  mergedFtsData: ReturnType<typeof useNoteData>['mergedFtsData']
  notes: NoteViewModel[]
  selectAllVisibleCallback: (source: (NoteViewModel | SearchResult)[]) => void
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
  showFTSResults,
  mergedFtsData,
  notes,
  selectAllVisibleCallback,
}: UseNoteBulkActionsParams) {
  const selectAllVisible = () => {
    const source = showFTSResults && mergedFtsData
      ? mergedFtsData.results
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
            operation: 'delete' as const,
            payload: {},
            clientUpdatedAt: new Date().toISOString(),
          }))
        )
        const now = new Date().toISOString()
        const updates: CachedNote[] = ids.map(id => ({
          id,
          status: 'pending' as const,
          deleted: true,
          updatedAt: now,
        }))
        for (const u of updates) await offlineCache.saveNote(u)
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
    selectAllVisible,
    deleteSelectedNotes,
  }
}
