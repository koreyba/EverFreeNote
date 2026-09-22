import { renderHook, act } from '@testing-library/react'
import { useNoteSync } from '@ui/web/hooks/useNoteSync'
import type { MutationQueueItem } from '@core/types/offline'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Capture the performSync callback passed to OfflineSyncManager's constructor
let capturedPerformSync: ((item: MutationQueueItem) => Promise<void>) | null = null

jest.mock('@core/services/offlineSyncManager', () => ({
  OfflineSyncManager: jest.fn().mockImplementation(
    (_storage: unknown, performSync: (item: MutationQueueItem) => Promise<void>) => {
      capturedPerformSync = performSync
      return { enqueue: jest.fn(), drainQueue: jest.fn(), dispose: jest.fn() }
    },
  ),
}))

jest.mock('@core/services/offlineQueue', () => ({
  OfflineQueueService: jest.fn().mockImplementation(() => ({
    enqueue: jest.fn(),
    enqueueMany: jest.fn(),
    getQueue: jest.fn().mockResolvedValue([]),
    getPendingBatch: jest.fn().mockResolvedValue([]),
    removeItems: jest.fn(),
    markStatus: jest.fn(),
    upsertQueue: jest.fn(),
  })),
}))

jest.mock('@core/services/offlineCache', () => ({
  OfflineCacheService: jest.fn().mockImplementation(() => ({
    markSynced: jest.fn(),
    saveNote: jest.fn(),
    loadNotes: jest.fn().mockResolvedValue([]),
    deleteNote: jest.fn(),
    saveNotes: jest.fn(),
  })),
}))

jest.mock('@ui/web/adapters/offlineStorage', () => ({
  webOfflineStorageAdapter: {},
}))

jest.mock('@ui/web/adapters/networkStatus', () => ({
  webNetworkStatus: { isOnline: () => true, subscribe: jest.fn(() => jest.fn()) },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeQueueItem = (overrides?: Partial<MutationQueueItem>): MutationQueueItem => ({
  id: 'q-1',
  noteId: 'note-1',
  operation: 'update',
  payload: { title: 'Title', description: 'Desc', tags: ['t'] },
  clientUpdatedAt: '2024-01-01T00:00:00Z',
  status: 'pending',
  ...overrides,
})

function renderSyncHook(mutations: {
  create?: jest.Mock
  update?: jest.Mock
  delete?: jest.Mock
} = {}) {
  return renderHook(() =>
    useNoteSync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-1' } as any,
      createNoteMutation: { mutateAsync: mutations.create ?? jest.fn() },
      updateNoteMutation: { mutateAsync: mutations.update ?? jest.fn() },
      deleteNoteMutation: { mutateAsync: mutations.delete ?? jest.fn() },
    }),
  )
}

// ---------------------------------------------------------------------------
// Tests — only the performSync callback of the sync manager.
// handleSaveNote upsert and resolveOpenableNote are tested elsewhere.
// ---------------------------------------------------------------------------

afterEach(async () => { await act(async () => {}) })

describe('useNoteSync — performSync upsert', () => {
  beforeEach(() => {
    capturedPerformSync = null
  })

  it('calls update directly when it succeeds', async () => {
    const update = jest.fn().mockResolvedValue({})
    const create = jest.fn()
    renderSyncHook({ update, create })

    expect(capturedPerformSync).not.toBeNull()
    await capturedPerformSync!(makeQueueItem())

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', title: 'Title' }),
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('falls back to create with same ID when update fails with PGRST116 (remote deletion)', async () => {
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })
    const update = jest.fn().mockRejectedValue(pgrst116)
    const create = jest.fn().mockResolvedValue({})
    renderSyncHook({ update, create })

    await capturedPerformSync!(makeQueueItem())

    expect(update).toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', userId: 'user-1', title: 'Title' }),
    )
  })

  it('re-throws non-PGRST116 update errors without attempting create', async () => {
    const update = jest.fn().mockRejectedValue(new Error('network failure'))
    const create = jest.fn()
    renderSyncHook({ update, create })

    await expect(
      capturedPerformSync!(makeQueueItem()),
    ).rejects.toThrow('network failure')

    expect(update).toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('does not start sync while authentication is being restored', async () => {
    renderHook(() =>
      useNoteSync({
        user: null,
        createNoteMutation: { mutateAsync: jest.fn() },
        updateNoteMutation: { mutateAsync: jest.fn() },
        deleteNoteMutation: { mutateAsync: jest.fn() },
      }),
    )

    expect(capturedPerformSync).toBeNull()
  })
})

describe('durable create synchronization', () => {
  it('uses the local ID and suppresses background notifications', async () => {
    const create = jest.fn().mockResolvedValue({})
    renderSyncHook({ create })
    await capturedPerformSync!(makeQueueItem({ operation: 'create' }))
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', silent: true }))
  })

  it('retries an acknowledged-on-server create by updating the same ID', async () => {
    const create = jest.fn().mockRejectedValue({ code: '23505' })
    const update = jest.fn().mockResolvedValue({})
    renderSyncHook({ create, update })
    await capturedPerformSync!(makeQueueItem({ operation: 'create' }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', title: 'Title', silent: true }))
  })

  it('keeps a failed recreate queued by propagating its error', async () => {
    renderSyncHook({ update: jest.fn().mockRejectedValue({ code: 'PGRST116' }), create: jest.fn().mockRejectedValue(new Error('network unavailable')) })
    await expect(capturedPerformSync!(makeQueueItem())).rejects.toThrow('network unavailable')
  })
})

it('starts draining only after authentication is restored, including remount effects', async () => {
  const { OfflineSyncManager } = await import('@core/services/offlineSyncManager')
  jest.mocked(OfflineSyncManager).mockClear()
  const props = { user: null as { id: string } | null }
  const { rerender } = renderHook(({ user }) => useNoteSync({
    user: user as never,
    createNoteMutation: { mutateAsync: jest.fn() },
    updateNoteMutation: { mutateAsync: jest.fn() },
    deleteNoteMutation: { mutateAsync: jest.fn() },
  }), { initialProps: props })
  expect(OfflineSyncManager).not.toHaveBeenCalled()
  rerender({ user: { id: 'user-1' } })
  expect(OfflineSyncManager).toHaveBeenCalledTimes(1)
})

it('does not upload another account\'s queued draft under the current account', async () => {
  const create = jest.fn()
  renderSyncHook({ create })
  await expect(capturedPerformSync!(makeQueueItem({ operation: 'create', payload: { title: 'Private', user_id: 'other-user' } })))
    .rejects.toThrow('another account')
  expect(create).not.toHaveBeenCalled()
})

it('retries quietly when backend access returns without a browser online event', async () => {
  jest.useFakeTimers()
  try {
    const { OfflineSyncManager } = await import('@core/services/offlineSyncManager')
    const hook = renderSyncHook()
    const manager = jest.mocked(OfflineSyncManager).mock.results.at(-1)?.value
    await act(async () => { jest.advanceTimersByTime(15000) })
    expect(manager.drainQueue).toHaveBeenCalledTimes(1)
    hook.unmount()
    await act(async () => { jest.advanceTimersByTime(15000) })
    expect(manager.drainQueue).toHaveBeenCalledTimes(1)
  } finally { jest.useRealTimers() }
})
