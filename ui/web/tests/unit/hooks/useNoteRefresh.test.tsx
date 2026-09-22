import { act, renderHook } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useNoteRefresh, type NoteRefreshOptions } from '@ui/web/hooks/useNoteRefresh'
import type { NoteViewModel } from '@core/types/domain'

jest.mock('sonner', () => ({ toast: { info: jest.fn() } }))
const note: NoteViewModel = { id: 'n1', user_id: 'u1', title: 'Remote', description: '<p>Updated</p>', tags: [], created_at: '2026-09-22', updated_at: '2026-09-22' }
function setup() {
  const queryClient = new QueryClient()
  const getNotes = jest.fn().mockResolvedValue({ notes: [note], totalCount: 1, hasMore: false })
  const getNoteStatus = jest.fn().mockResolvedValue({ status: 'found', note })
  const options: NoteRefreshOptions = { userId: 'u1', tabId: 't1', note, isEditing: false, queryClient, noteService: { getNotes, getNoteStatus }, hasPendingChanges: jest.fn(() => false), onNoteRefreshed: jest.fn(), onNoteDeleted: jest.fn().mockResolvedValue(undefined) }
  const hook = renderHook((props: NoteRefreshOptions) => useNoteRefresh(props), { initialProps: options })
  return { ...hook, options, queryClient, getNotes, getNoteStatus, signal: new AbortController().signal }
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
