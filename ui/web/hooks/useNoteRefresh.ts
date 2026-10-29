/* eslint no-unused-vars: "off", "@typescript-eslint/no-unused-vars": "error" -- Use the TypeScript-aware rule for callback declarations. */
import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { OfflineCacheService } from '@core/services/offlineCache'
import type { CachedNote } from '@core/types/offline'
import type { NoteService } from '@core/services/notes'
import type { NoteViewModel } from '@core/types/domain'
import { SEARCH_CONFIG } from '@core/constants/search'
import { snapshotEvidence } from '@ui/web/lib/offlineOwnership'
import { noteListRevision } from '@ui/web/lib/noteListRevision'
export type NoteRefreshOptions = {
  userId?: string
  tabId: string
  note?: NoteViewModel
  isEditing: boolean
  noteService: Pick<NoteService, 'getNotes' | 'getNoteStatus' | 'getExistingNoteIds'>
  offlineCache: Pick<OfflineCacheService, 'loadNotes'>
  onCachedNotesUnavailable: (notes: CachedNote[]) => void
  onCachedNotesAvailable?: (ids: string[]) => void
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
    const ownerId = current.userId
    if (!ownerId || signal.aborted) return
    const queryKey = ['notes', ownerId, '', null]
    const listAtStart = current.queryClient.getQueryData(queryKey)
    const revision = noteListRevision(current.queryClient, ownerId)
    const isCurrent = () => !signal.aborted && latest.current.userId === ownerId &&
      noteListRevision(current.queryClient, ownerId) === revision &&
      current.queryClient.getQueryData(queryKey) === listAtStart
    const page = await current.noteService.getNotes(ownerId, { page: 0, pageSize: SEARCH_CONFIG.PAGE_SIZE, signal })
    if (!isCurrent()) return
    const cached = await current.offlineCache.loadNotes()
    const visibleIds = new Set(page.notes.map(note => note.id))
    const candidates = cached.filter(note => (
      note.user_id === ownerId && note.status === 'synced' &&
      !note.deleted && !note.pendingOps?.length && !visibleIds.has(note.id) &&
      !latest.current.hasPendingChanges(note.id)
    ))
    const existing = new Set(await current.noteService.getExistingNoteIds(candidates.map(note => note.id), ownerId, signal))
    if (!isCurrent()) return
    const missing = candidates.filter(note => !existing.has(note.id) && !latest.current.hasPendingChanges(note.id))
    await current.queryClient.cancelQueries({ queryKey, exact: true })
    if (!isCurrent()) return
    // The existence request may have been in flight while a copy was deleted
    // or edited. Do not report its old snapshot as an unavailable copy.
    let stillMissing = missing
    if (missing.length) {
      const cachedNow = await current.offlineCache.loadNotes()
      if (!isCurrent()) return
      const currentById = new Map(cachedNow.map(note => [note.id, note]))
      stillMissing = missing.filter(note => {
        const now = currentById.get(note.id)
        return now && snapshotEvidence(now) === snapshotEvidence(note) && !latest.current.hasPendingChanges(note.id)
      })
    }
    // Use the callback captured when the refresh started so a newer warning
    // cannot be cleared by an older server response.
    current.onCachedNotesAvailable?.([...visibleIds, ...existing])
    // A missing response does not establish that this is a disposable copy.
    if (stillMissing.length) {
      latest.current.onCachedNotesUnavailable(stillMissing)
      toast.info('Some local copies are unavailable on the server and remain on this device.')
    }
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
