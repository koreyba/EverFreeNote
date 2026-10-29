import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useRestoredNoteValidation } from '@ui/web/hooks/useRestoredNoteValidation'
import { advanceNoteListRevision } from '@ui/web/lib/noteListRevision'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { CachedNote, MutationQueueItem } from '@core/types/offline'

const makeTab = (userId: string, id: string): NoteWorkspaceTab => ({
  id: `tab-${id}`, noteId: id,
  note: { id, user_id: userId, title: id, description: `<p>${id}</p>`, tags: [], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' },
  mode: 'reading', draft: { title: id, description: `<p>${id}</p>`, tags: '' }, view: { scrollTop: 0 }, saveState: 'saved', saveError: null,
})
const makeCache = (tab: NoteWorkspaceTab): CachedNote => ({ ...tab.note!, id: tab.noteId!, status: 'synced', updatedAt: '2026-10-01T00:00:00Z' })

afterEach(() => { jest.restoreAllMocks() })

it('ignores both old responses after a rapid A to B to A switch', async () => {
  const tabA = makeTab('owner-a', 'note-a')
  const tabB = makeTab('owner-b', 'note-b')
  const tabsA = [tabA]
  const tabsB = [tabB]
  let session = { userId: 'owner-a', epoch: 1 }
  const waiting: Array<(ids: string[]) => void> = []
  const getExistingNoteIds = jest.fn(() => new Promise<string[]>(resolve => { waiting.push(resolve) }))
  const onUnavailable = jest.fn()
  const onAvailable = jest.fn()
  const common = {
    offline: false, storageReady: true, storageError: false, pendingCount: 0, failedCount: 0, hasPendingWorkspaceWrites: false,
    hasPendingWritesForTab: () => false,
    cache: { loadNotes: async () => [makeCache(tabA), makeCache(tabB)] },
    queue: { getQueue: async () => [] }, noteService: { getExistingNoteIds }, queryClient: new QueryClient(),
    getSessionSnapshot: () => session, onUnavailable, onAvailable,
  }
  const { rerender, result } = renderHook(props => useRestoredNoteValidation(props), {
    initialProps: { ...common, ownerId: 'owner-a', epoch: 1, restoredTabs: tabsA, currentTabs: tabsA },
  })
  await waitFor(() => expect(waiting).toHaveLength(1))
  act(() => { session = { userId: 'owner-b', epoch: 2 }; rerender({ ...common, ownerId: 'owner-b', epoch: 2, restoredTabs: tabsB, currentTabs: tabsB }) })
  await waitFor(() => expect(waiting).toHaveLength(2))
  act(() => { session = { userId: 'owner-a', epoch: 3 }; rerender({ ...common, ownerId: 'owner-a', epoch: 3, restoredTabs: tabsA, currentTabs: tabsA }) })
  await waitFor(() => expect(waiting).toHaveLength(3))
  await act(async () => { waiting[0]([]); waiting[1]([]); await Promise.resolve() })
  expect(onUnavailable).not.toHaveBeenCalled()
  expect(onAvailable).not.toHaveBeenCalled()
  await act(async () => { waiting[2](['note-a']) })
  await waitFor(() => expect(result.current.status).toEqual('idle'))
  expect(onUnavailable).not.toHaveBeenCalled()
  expect(onAvailable).toHaveBeenCalledTimes(1)
  expect(onAvailable).toHaveBeenCalledWith(['note-a'])
})

it('does not use a response started before a local delete', async () => {
  const tab = makeTab('owner-a', 'note-a')
  let resolve!: (ids: string[]) => void
  const getExistingNoteIds = jest.fn(() => new Promise<string[]>(done => { resolve = done }))
  const onUnavailable = jest.fn()
  const queryClient = new QueryClient()
  const common = {
    ownerId: 'owner-a', epoch: 1, restoredTabs: [tab], offline: false, storageReady: true, storageError: false,
    pendingCount: 0, failedCount: 0, hasPendingWorkspaceWrites: false, hasPendingWritesForTab: () => false,
    cache: { loadNotes: async () => [makeCache(tab)] }, queue: { getQueue: async () => [] },
    noteService: { getExistingNoteIds }, queryClient, getSessionSnapshot: () => ({ userId: 'owner-a', epoch: 1 }),
    onUnavailable, onAvailable: jest.fn(),
  }
  const { result, rerender } = renderHook(props => useRestoredNoteValidation(props), { initialProps: { ...common, currentTabs: [tab] } })
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(1))
  act(() => { advanceNoteListRevision(queryClient, 'owner-a'); rerender({ ...common, currentTabs: [] }) })
  await act(async () => { resolve([]) })
  await waitFor(() => expect(result.current.status).toEqual('idle'))
  expect(onUnavailable).not.toHaveBeenCalled()
})

it('does not infer deletion for a pending create or a snapshot changed during the request', async () => {
  const tab = makeTab('owner-a', 'note-a')
  let cached = [makeCache(tab)]
  let queued: MutationQueueItem[] = [{ id: 'queued-create', noteId: 'note-a', operation: 'create', payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-10-01T00:00:00Z', status: 'pending' }]
  let resolve!: (ids: string[]) => void
  const getExistingNoteIds = jest.fn(() => new Promise<string[]>(done => { resolve = done }))
  const loadNotes = jest.fn(async () => cached)
  const onUnavailable = jest.fn()
  const options = {
    ownerId: 'owner-a', epoch: 1, restoredTabs: [tab], currentTabs: [tab], offline: false, storageReady: true, storageError: false,
    pendingCount: 1, failedCount: 0, hasPendingWorkspaceWrites: false, hasPendingWritesForTab: () => false,
    cache: { loadNotes }, queue: { getQueue: async () => queued }, noteService: { getExistingNoteIds }, queryClient: new QueryClient(),
    getSessionSnapshot: () => ({ userId: 'owner-a', epoch: 1 }), onUnavailable, onAvailable: jest.fn(),
  }
  const { result, rerender } = renderHook(props => useRestoredNoteValidation(props), { initialProps: options })
  await waitFor(() => expect(loadNotes).toHaveBeenCalled())
  await waitFor(() => expect(result.current.status).toEqual('idle'))
  expect(getExistingNoteIds).not.toHaveBeenCalled()
  queued = []
  rerender({ ...options, pendingCount: 0 })
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(1))
  cached = [{ ...cached[0], title: 'New local version', updatedAt: '2026-10-02T00:00:00Z' }]
  await act(async () => { resolve([]) })
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(2))
  expect(onUnavailable).not.toHaveBeenCalled()
  await act(async () => { resolve(['note-a']) })
  await waitFor(() => expect(result.current.status).toEqual('idle'))
  expect(onUnavailable).not.toHaveBeenCalled()
  expect(cached[0].title).toEqual('New local version')
})

it('does not restart a completed check when equivalent service wrappers change identity', async () => {
  const tab = makeTab('owner-a', 'note-a')
  const tabs = [tab]
  const getExistingNoteIds = jest.fn().mockResolvedValue(['note-a'])
  const onAvailable = jest.fn()
  const queryClient = new QueryClient()
  const makeOptions = () => ({
    ownerId: 'owner-a', epoch: 1, restoredTabs: tabs, currentTabs: tabs, offline: false, storageReady: true, storageError: false,
    pendingCount: 0, failedCount: 0, hasPendingWorkspaceWrites: false, hasPendingWritesForTab: () => false,
    cache: { loadNotes: async () => [makeCache(tab)] }, queue: { getQueue: async () => [] }, noteService: { getExistingNoteIds }, queryClient,
    getSessionSnapshot: () => ({ userId: 'owner-a', epoch: 1 }), onUnavailable: jest.fn(), onAvailable,
  })
  const { result, rerender } = renderHook(props => useRestoredNoteValidation(props), { initialProps: makeOptions() })
  await waitFor(() => expect(onAvailable).toHaveBeenCalledWith(['note-a']))
  expect(result.current.status).toEqual('idle')
  rerender(makeOptions())
  expect(getExistingNoteIds).toHaveBeenCalledTimes(1)
  act(() => { result.current.retry() })
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(2))
})

it('stops checking when the restored tab closes while the server request is stalled', async () => {
  const tab = makeTab('owner-a', 'note-a')
  let signal: AbortSignal | undefined
  const getExistingNoteIds = jest.fn((_ids: string[], _owner: string, requestSignal?: AbortSignal) => {
    signal = requestSignal
    return new Promise<string[]>(() => {})
  })
  const common = {
    ownerId: 'owner-a', epoch: 1, restoredTabs: [tab], offline: false, storageReady: true, storageError: false,
    pendingCount: 0, failedCount: 0, hasPendingWorkspaceWrites: false, hasPendingWritesForTab: () => false,
    cache: { loadNotes: async () => [makeCache(tab)] }, queue: { getQueue: async () => [] },
    noteService: { getExistingNoteIds }, queryClient: new QueryClient(), getSessionSnapshot: () => ({ userId: 'owner-a', epoch: 1 }),
    onUnavailable: jest.fn(), onAvailable: jest.fn(),
  }
  const { result, rerender } = renderHook(props => useRestoredNoteValidation(props), { initialProps: { ...common, currentTabs: [tab] } })
  await waitFor(() => expect(getExistingNoteIds).toHaveBeenCalledTimes(1))
  expect(result.current.status).toEqual('checking')
  rerender({ ...common, currentTabs: [] })
  await waitFor(() => expect(result.current.status).toEqual('idle'))
  expect(signal?.aborted).toBe(true)
})

it('offers retry when the restored note check hangs without declaring a deletion', async () => {
  jest.useFakeTimers()
  try {
    const tab = makeTab('owner-a', 'note-a')
    const tabs = [tab]
    const queryClient = new QueryClient()
    const requests: Array<{ signal?: AbortSignal; resolve: (ids: string[]) => void }> = []
    const onUnavailable = jest.fn()
    const getExistingNoteIds = jest.fn((_ids: string[], _owner: string, requestSignal?: AbortSignal) => {
      return new Promise<string[]>(resolve => { requests.push({ signal: requestSignal, resolve }) })
    })
    const { result } = renderHook(() => useRestoredNoteValidation({
      ownerId: 'owner-a', epoch: 1, restoredTabs: tabs, currentTabs: tabs, offline: false, storageReady: true, storageError: false,
      pendingCount: 0, failedCount: 0, hasPendingWorkspaceWrites: false, hasPendingWritesForTab: () => false,
      cache: { loadNotes: async () => [makeCache(tab)] }, queue: { getQueue: async () => [] }, noteService: { getExistingNoteIds },
      queryClient, getSessionSnapshot: () => ({ userId: 'owner-a', epoch: 1 }), onUnavailable, onAvailable: jest.fn(),
    }))
    await act(async () => { await Promise.resolve() })
    expect(getExistingNoteIds).toHaveBeenCalledTimes(1)
    act(() => { jest.advanceTimersByTime(15000) })
    expect(result.current.status).toEqual('error')
    expect(requests[0].signal?.aborted).toBe(true)
    await act(async () => { requests[0].resolve([]) })
    expect(result.current.status).toEqual('error')
    expect(onUnavailable).not.toHaveBeenCalled()
    await act(async () => { result.current.retry(); await Promise.resolve() })
    expect(requests).toHaveLength(2)
    await act(async () => { requests[1].resolve(['note-a']) })
    expect(result.current.status).toEqual('idle')
  } finally {
    jest.useRealTimers()
  }
})
