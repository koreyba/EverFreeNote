import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { NoteService } from '@core/services/notes'
import type { NoteViewModel } from '@core/types/domain'
import { SEARCH_CONFIG } from '@core/constants/search'
export type NoteRefreshOptions = {
  userId?: string
  tabId: string
  note: NoteViewModel | null
  isEditing: boolean
  noteService: Pick<NoteService, 'getNotes' | 'getNoteStatus'>
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
    const queryKey = ['notes', current.userId, '', null]
    await current.queryClient.cancelQueries({ queryKey, exact: true })
    if (signal.aborted || latest.current.userId !== current.userId) return
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
