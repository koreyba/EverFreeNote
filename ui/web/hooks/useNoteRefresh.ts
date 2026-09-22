/* eslint no-unused-vars: "off", "@typescript-eslint/no-unused-vars": "error" -- Use the TypeScript-aware rule for callback declarations. */
import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { OfflineCacheService } from '@core/services/offlineCache'
import type { CachedNote } from '@core/types/offline'
import type { NoteService } from '@core/services/notes'
import type { NoteViewModel } from '@core/types/domain'
import { SEARCH_CONFIG } from '@core/constants/search'
export type NoteRefreshOptions = {
  userId?: string
  tabId: string
  note?: NoteViewModel
  isEditing: boolean
  noteService: Pick<NoteService, 'getNotes' | 'getNoteStatus' | 'getExistingNoteIds'>
  offlineCache: Pick<OfflineCacheService, 'loadNotes' | 'removeSyncedNotes'>
  onCachedNotesRemoved: (notes: CachedNote[]) => void
  queryClient: QueryClient
  hasPendingChanges: (id: string) => boolean
  onNoteRefreshed: (note: NoteViewModel) => void
  onNoteDeleted: (id: string) => Promise<void>
}
export function useNoteRefresh(options: NoteRefreshOptions) {
  const latest = useRef(options)
  useEffect(() => { latest.current = options }, [options])

  const refreshList = useCallback(async (signal: AbortSignal) => {
    const current = latest.current
    if (!current.userId || signal.aborted) return
    const page = await current.noteService.getNotes(current.userId, { page: 0, pageSize: SEARCH_CONFIG.PAGE_SIZE, signal })
    if (signal.aborted || latest.current.userId !== current.userId) return
    const cached = await current.offlineCache.loadNotes()
    const visibleIds = new Set(page.notes.map(note => note.id))
    const candidates = cached.filter(note => (
      (!note.user_id || note.user_id === current.userId) && note.status === 'synced' &&
      !note.deleted && !note.pendingOps?.length && !visibleIds.has(note.id) &&
      !latest.current.hasPendingChanges(note.id)
    ))
    const existing = new Set(await current.noteService.getExistingNoteIds(candidates.map(note => note.id), current.userId, signal))
    if (signal.aborted || latest.current.userId !== current.userId) return
    const missing = candidates.filter(note => !existing.has(note.id) && !latest.current.hasPendingChanges(note.id))
    const queryKey = ['notes', current.userId, '', null]
    await current.queryClient.cancelQueries({ queryKey, exact: true })
    if (signal.aborted || latest.current.userId !== current.userId) return
    const removedIds = new Set(await current.offlineCache.removeSyncedNotes(missing, signal))
    if (signal.aborted || latest.current.userId !== current.userId) return
    const removed = missing.filter(note => removedIds.has(note.id) && !latest.current.hasPendingChanges(note.id))
    if (removed.length) latest.current.onCachedNotesRemoved(removed)
    current.queryClient.setQueryData(queryKey, { pages: [page], pageParams: [0] })
  }, [])

  const refreshNote = useCallback(async (signal: AbortSignal) => {
    const current = latest.current
    const id = current.note?.id
    if (!id || !current.userId || current.isEditing || signal.aborted) return
    if (current.hasPendingChanges(id)) {
      toast.info('Local changes are waiting to sync.')
      return
    }
    const result = await current.noteService.getNoteStatus(id, signal)
    const active = latest.current
    if (signal.aborted || active.userId !== current.userId || active.tabId !== current.tabId ||
      active.note?.id !== id || active.isEditing || active.hasPendingChanges(id)) return
    if (result.status === 'transient_error') throw result.error
    if (result.status === 'not_found') await active.onNoteDeleted(id)
    else active.onNoteRefreshed(result.note)
  }, [])

  return { refreshList, refreshNote }
}
