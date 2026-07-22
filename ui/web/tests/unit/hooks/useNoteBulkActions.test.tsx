import { act, renderHook } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNoteBulkActions } from '@ui/web/hooks/useNoteBulkActions'
import type { NoteViewModel } from '@core/types/domain'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const note = (id: string): NoteViewModel => ({
  id,
  title: `Note ${id}`,
  description: 'Description',
  tags: [],
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

type BulkActionParams = Parameters<typeof useNoteBulkActions>[0]

const makeParams = (overrides: Partial<BulkActionParams> = {}) => {
  const queryClient = new QueryClient()
  const params: BulkActionParams = {
    selectedNoteIds: new Set<string>(),
    isOffline: false,
    enqueueBatchAndDrainIfOnline: jest.fn().mockResolvedValue(undefined),
    offlineCache: { saveNote: jest.fn().mockResolvedValue(undefined) },
    setOfflineOverlay: jest.fn(),
    setPendingCount: jest.fn(),
    deleteNoteMutation: { mutateAsync: jest.fn().mockResolvedValue(undefined) },
    exitSelectionMode: jest.fn(),
    setBulkDeleting: jest.fn(),
    setSelectedNote: jest.fn(),
    queryClient,
    notes: [note('visible')],
    selectAllVisibleCallback: jest.fn(),
    ...overrides,
  }
  return { params, queryClient }
}

describe('useNoteBulkActions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns an empty result without invoking services for no ids', async () => {
    const { params, queryClient } = makeParams()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useNoteBulkActions(params))

    await expect(result.current.deleteNotesByIds([])).resolves.toEqual({
      total: 0,
      failed: 0,
      queuedOffline: false,
    })
    expect(params.deleteNoteMutation.mutateAsync).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('deletes online ids independently and invalidates note and AI caches', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined)
    const { params, queryClient } = makeParams({
      selectedNoteIds: new Set(['one', 'two']),
      deleteNoteMutation: { mutateAsync },
    })
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useNoteBulkActions(params))

    await expect(result.current.deleteNotesByIds(['one', 'two'])).resolves.toEqual({
      total: 2,
      failed: 0,
      queuedOffline: false,
    })

    expect(mutateAsync).toHaveBeenNthCalledWith(1, { id: 'one', silent: true })
    expect(mutateAsync).toHaveBeenNthCalledWith(2, { id: 'two', silent: true })
    expect(toast.success).toHaveBeenCalledWith('Deleted 2 notes')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notes'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['aiSearch'] })
    expect(params.setSelectedNote).toHaveBeenCalledWith(null)
  })

  it('reports partial online failures but still refreshes the local queries', async () => {
    const mutateAsync = jest.fn().mockImplementation(({ id }: { id: string }) =>
      id === 'bad' ? Promise.reject(new Error('delete failed')) : Promise.resolve(undefined)
    )
    const { params, queryClient } = makeParams({ deleteNoteMutation: { mutateAsync } })
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useNoteBulkActions(params))

    await expect(result.current.deleteNotesByIds(['good', 'bad'])).resolves.toEqual({
      total: 2,
      failed: 1,
      queuedOffline: false,
    })
    expect(toast.error).toHaveBeenCalledWith('Failed to delete 1 notes')
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(params.setSelectedNote).toHaveBeenCalledWith(null)
  })

  it('queues offline deletions, persists optimistic tombstones, and updates overlay state', async () => {
    const setOfflineOverlay = jest.fn()
    const setPendingCount = jest.fn()
    const saveNote = jest.fn().mockResolvedValue(undefined)
    const enqueue = jest.fn().mockResolvedValue(undefined)
    const { params } = makeParams({
      isOffline: true,
      enqueueBatchAndDrainIfOnline: enqueue,
      offlineCache: { saveNote },
      setOfflineOverlay,
      setPendingCount,
    })
    const { result } = renderHook(() => useNoteBulkActions(params))

    await expect(result.current.deleteNotesByIds(['one', 'two'])).resolves.toMatchObject({
      total: 2,
      failed: 0,
      queuedOffline: true,
    })

    expect(enqueue).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ noteId: 'one', operation: 'delete', payload: {} }),
      expect.objectContaining({ noteId: 'two', operation: 'delete', payload: {} }),
    ]))
    expect(saveNote).toHaveBeenCalledTimes(2)
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'one', deleted: true, status: 'pending' }))
    expect(setOfflineOverlay).toHaveBeenCalledWith(expect.any(Function))
    const applyOverlay = setOfflineOverlay.mock.calls[0][0] as (current: Array<{ id: string }>) => Array<{ id: string }>
    expect(applyOverlay([]).map((entry) => entry.id)).toEqual(['one', 'two'])
    expect(setPendingCount).toHaveBeenCalledWith(expect.any(Function))
    expect(toast.success).toHaveBeenCalledWith('Queued deletion of 2 notes (offline)')
  })

  it('manages the bulk deleting transition and exits selection mode only on success', async () => {
    const { params } = makeParams({ selectedNoteIds: new Set(['one']) })
    const { result } = renderHook(() => useNoteBulkActions(params))

    await act(async () => {
      await result.current.deleteSelectedNotes()
    })

    expect(params.setBulkDeleting).toHaveBeenNthCalledWith(1, true)
    expect(params.setBulkDeleting).toHaveBeenLastCalledWith(false)
    expect(params.exitSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('does nothing when selection mode has no selected ids', async () => {
    const { params } = makeParams()
    const { result } = renderHook(() => useNoteBulkActions(params))

    await act(async () => {
      await result.current.deleteSelectedNotes()
    })

    expect(params.setBulkDeleting).not.toHaveBeenCalled()
    expect(params.exitSelectionMode).not.toHaveBeenCalled()
  })

  it('selects all currently visible notes through the selection callback', () => {
    const { params } = makeParams()
    const { result } = renderHook(() => useNoteBulkActions(params))

    act(() => result.current.selectAllVisible())

    expect(params.selectAllVisibleCallback).toHaveBeenCalledWith(params.notes)
  })
})
