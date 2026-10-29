import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useNoteRefresh, type NoteRefreshOptions } from '@ui/web/hooks/useNoteRefresh'
import { OfflineCacheService } from '@core/services/offlineCache'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import type { CachedNote } from '@core/types/offline'
import type { NoteViewModel } from '@core/types/domain'
import { advanceNoteListRevision } from '@ui/web/lib/noteListRevision'

jest.mock('sonner', () => ({ toast: { info: jest.fn() } }))
const note: NoteViewModel = { id: 'n1', user_id: 'u1', title: 'Remote', description: '<p>Updated</p>', tags: [], created_at: '2026-09-22', updated_at: '2026-09-22' }
const offlineCache = new OfflineCacheService(webOfflineStorageAdapter)
beforeEach(() => localStorage.clear())
const cached = (id: string, extra: Partial<CachedNote> = {}): CachedNote => ({ ...note, id, status: 'synced', updatedAt: note.updated_at, ...extra })
function setup() {
  const queryClient = new QueryClient()
  const getNotes = jest.fn().mockResolvedValue({ notes: [note], totalCount: 1, hasMore: false })
  const getNoteStatus = jest.fn().mockResolvedValue({ status: 'found', note })
  const getExistingNoteIds = jest.fn().mockResolvedValue([])
  const options: NoteRefreshOptions = { userId: 'u1', tabId: 't1', note, isEditing: false, queryClient, offlineCache, onCachedNotesUnavailable: jest.fn(), onCachedNotesAvailable: jest.fn(), noteService: { getNotes, getNoteStatus, getExistingNoteIds }, hasPendingChanges: jest.fn(() => false), onNoteRefreshed: jest.fn(), onNoteDeleted: jest.fn().mockResolvedValue(undefined) }
  const hook = renderHook((props: NoteRefreshOptions) => useNoteRefresh(props), { initialProps: options })
  return { ...hook, options, queryClient, getNotes, getNoteStatus, getExistingNoteIds, signal: new AbortController().signal }
}
it('replaces the list with the newest first page without changing an open note', async () => {
  const { result, options, queryClient, getNotes, signal } = setup()
  await act(async () => result.current.refreshList(signal))
  expect(getNotes).toHaveBeenCalledWith('u1', expect.objectContaining({ page: 0, signal }))
  expect(queryClient.getQueryData(['notes', 'u1', '', null])).toEqual({ pages: [{ notes: [note], totalCount: 1, hasMore: false }], pageParams: [0] })
  expect(options.onNoteRefreshed).not.toHaveBeenCalled()
})
it('keeps the previous list when the server is unreachable', async () => {
  const { result, queryClient, getNotes, signal } = setup()
  const old = { pages: [{ notes: [{ ...note, title: 'Local list' }] }], pageParams: [0] }
  queryClient.setQueryData(['notes', 'u1', '', null], old)
  getNotes.mockRejectedValue(new Error('Offline'))
  await expect(result.current.refreshList(signal)).rejects.toThrow('Offline')
  expect(queryClient.getQueryData(['notes', 'u1', '', null])).toEqual(old)
})
it('refreshes the reading snapshot and handles remote deletion', async () => {
  const { result, options, getNoteStatus, signal } = setup()
  await act(async () => result.current.refreshNote(signal))
  expect(options.onNoteRefreshed).toHaveBeenCalledWith(note)
  getNoteStatus.mockResolvedValue({ status: 'not_found' })
  await act(async () => result.current.refreshNote(signal))
  expect(options.onNoteDeleted).toHaveBeenCalledWith('n1')
})
it('keeps queued local changes instead of replacing them from the server', async () => {
  const { result, options, getNoteStatus, signal } = setup()
  jest.mocked(options.hasPendingChanges).mockReturnValue(true)
  await act(async () => result.current.refreshNote(signal))
  expect(options.onNoteRefreshed).not.toHaveBeenCalled()
  expect(getNoteStatus).not.toHaveBeenCalled()
})
it('keeps the reading snapshot when the server returns a transient error', async () => {
  const { result, options, getNoteStatus, signal } = setup()
  getNoteStatus.mockResolvedValue({ status: 'transient_error', error: new Error('Offline') })
  await expect(result.current.refreshNote(signal)).rejects.toThrow('Offline')
  expect(options.onNoteRefreshed).not.toHaveBeenCalled()
  expect(options.onNoteDeleted).not.toHaveBeenCalled()
})
it('does not replace another account list after an in-flight refresh', async () => {
  const { result, options, getNotes, queryClient, rerender, signal } = setup()
  let finish!: (value: unknown) => void
  getNotes.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const pending = result.current.refreshList(signal)
  expect(getNotes).toHaveBeenCalledTimes(1)
  rerender({ ...options, userId: 'u2' })
  await act(async () => { finish({ notes: [note], totalCount: 1, hasMore: false }); await pending })
  expect(queryClient.getQueryData(['notes', 'u1', '', null])).toBeUndefined()
  expect(queryClient.getQueryData(['notes', 'u2', '', null])).toBeUndefined()
})
it('does not replace a newer list with an older in-flight response', async () => {
  const { result, getNotes, queryClient, signal } = setup()
  const queryKey = ['notes', 'u1', '', null]
  const old = { pages: [{ notes: [note], totalCount: 1, hasMore: false }], pageParams: [0] }
  const afterDelete = { pages: [{ notes: [], totalCount: 0, hasMore: false }], pageParams: [0] }
  queryClient.setQueryData(queryKey, old)
  let finish!: (page: unknown) => void
  getNotes.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const pending = result.current.refreshList(signal)
  queryClient.setQueryData(queryKey, afterDelete)
  await act(async () => { finish(old.pages[0]); await pending })
  expect(queryClient.getQueryData(queryKey)).toEqual(afterDelete)
})
it('ignores a pre-delete response even when the deleted note was not in the loaded page', async () => {
  const { result, getNotes, queryClient, signal } = setup()
  const queryKey = ['notes', 'u1', '', null]
  const empty = { pages: [{ notes: [], totalCount: 0, hasMore: false }], pageParams: [0] }
  queryClient.setQueryData(queryKey, empty)
  let finish!: (page: unknown) => void
  getNotes.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const pending = result.current.refreshList(signal)
  advanceNoteListRevision(queryClient, 'u1')
  await act(async () => { finish({ notes: [note], totalCount: 1, hasMore: false }); await pending })
  expect(queryClient.getQueryData(queryKey)).toEqual(empty)
  await act(async () => result.current.refreshList(signal))
  expect(queryClient.getQueryData(queryKey)).toEqual({ pages: [{ notes: [note], totalCount: 1, hasMore: false }], pageParams: [0] })
})
it.each(['editing', 'tab', 'account', 'pending', 'aborted'])('ignores a late reading response after %s changes', async (change) => {
  const { result, options, getNoteStatus, rerender } = setup()
  let finish!: (value: unknown) => void
  getNoteStatus.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const abort = new AbortController()
  let pending!: Promise<void>
  act(() => { pending = result.current.refreshNote(abort.signal) })
  expect(getNoteStatus).toHaveBeenCalledTimes(1)
  if (change === 'aborted') abort.abort()
  else if (change === 'pending') jest.mocked(options.hasPendingChanges).mockReturnValue(true)
  else rerender({ ...options, isEditing: change === 'editing', tabId: change === 'tab' ? 't2' : 't1', userId: change === 'account' ? 'u2' : 'u1' })
  await act(async () => { finish({ status: 'found', note }); await pending })
  expect(options.onNoteRefreshed).not.toHaveBeenCalled()
})

it('retains remotely absent cached notes on list refresh without opening them', async () => {
  const { result, signal, getExistingNoteIds, options } = setup()
  await offlineCache.saveNotes([cached('gone-1'), cached('gone-2')])
  await act(async () => result.current.refreshList(signal))
  expect(await offlineCache.loadNotes()).toEqual([cached('gone-1'), cached('gone-2')])
  expect(getExistingNoteIds).toHaveBeenCalledWith(['gone-1', 'gone-2'], 'u1', signal)
  expect(options.onCachedNotesUnavailable).toHaveBeenCalledWith([cached('gone-1'), cached('gone-2')])
})
it('retains cached notes from later pages, unsynced drafts and other accounts', async () => {
  const { result, signal, getExistingNoteIds } = setup()
  const saved = [cached('older'), cached('draft', { status: 'pending' }), cached('failed', { status: 'failed' }), cached('foreign', { user_id: 'u2' })]
  await offlineCache.saveNotes(saved)
  getExistingNoteIds.mockResolvedValue(['older'])
  await act(async () => result.current.refreshList(signal))
  expect(await offlineCache.loadNotes()).toEqual(saved)
  expect(getExistingNoteIds).toHaveBeenCalledWith(['older'], 'u1', signal)
})
it('reports only server-verified IDs as available, including notes outside the first page', async () => {
  const { result, signal, getExistingNoteIds, options } = setup()
  await offlineCache.saveNotes([cached('older'), cached('missing')])
  getExistingNoteIds.mockResolvedValue(['older'])
  await act(async () => result.current.refreshList(signal))
  expect(options.onCachedNotesAvailable).toHaveBeenCalledWith(['n1', 'older'])
  expect(options.onCachedNotesUnavailable).toHaveBeenCalledWith([cached('missing')])
})
it('does not report an old cached snapshot after it was deleted or edited during verification', async () => {
  const { result, options, getExistingNoteIds, signal } = setup()
  await offlineCache.saveNotes([cached('deleted'), cached('edited'), cached('still-missing')])
  let finish!: (ids: string[]) => void
  getExistingNoteIds.mockImplementation(() => new Promise<string[]>(done => { finish = done }))
  const pending = result.current.refreshList(signal)
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(1))
  await offlineCache.deleteNote('deleted')
  await offlineCache.saveNote(cached('edited', { title: 'A later edit', status: 'pending' }))
  await act(async () => { finish([]); await pending })
  expect(options.onCachedNotesUnavailable).toHaveBeenCalledWith([cached('still-missing')])
})
it('retains the cache and list if deletion verification fails', async () => {
  const { result, signal, getExistingNoteIds, queryClient } = setup()
  await offlineCache.saveNote(cached('gone'))
  const old = { pages: [{ notes: [note] }], pageParams: [0] }
  queryClient.setQueryData(['notes', 'u1', '', null], old)
  getExistingNoteIds.mockRejectedValue(new Error('No connection'))
  await expect(result.current.refreshList(signal)).rejects.toThrow('No connection')
  expect(await offlineCache.loadNotes()).toEqual([cached('gone')])
  expect(queryClient.getQueryData(['notes', 'u1', '', null])).toEqual(old)
})
it.each(['edit', 'queue', 'abort', 'account', 'editor'])('preserves a cached note when %s changes during deletion verification', async change => {
  const { result, options, rerender, getExistingNoteIds } = setup()
  await offlineCache.saveNote(cached('gone'))
  const abort = new AbortController()
  let finish!: (ids: string[]) => void
  getExistingNoteIds.mockImplementation(() => new Promise<string[]>(done => { finish = done }))
  const pending = result.current.refreshList(abort.signal)
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(1))
  if (change === 'edit') await offlineCache.saveNote(cached('gone', { title: 'New edit', status: 'pending' }))
  if (change === 'queue') await webOfflineStorageAdapter.upsertQueueItem({ id: 'op', noteId: 'gone', operation: 'update', payload: { user_id: 'u1' }, clientUpdatedAt: note.updated_at, status: 'pending' })
  if (change === 'editor') jest.mocked(options.hasPendingChanges).mockReturnValue(true)
  if (change === 'abort') abort.abort()
  if (change === 'account') rerender({ ...options, userId: 'u2' })
  await act(async () => { finish([]); await pending })
  expect(await offlineCache.loadNotes()).toHaveLength(1)
})

it('never removes a local copy in response to a missing server row', async () => {
  const { result, signal } = setup()
  await offlineCache.saveNote(cached('gone'))
  const remove = jest.spyOn(offlineCache, 'removeSyncedNotes')
  try {
    await act(async () => result.current.refreshList(signal))
    expect(remove).not.toHaveBeenCalled()
    expect(await offlineCache.loadNotes()).toEqual([cached('gone')])
  } finally { remove.mockRestore() }
})
