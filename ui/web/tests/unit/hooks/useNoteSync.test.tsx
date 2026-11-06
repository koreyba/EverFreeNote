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
      return { enqueue: jest.fn(), drainQueue: jest.fn(), requestDrain: jest.fn().mockResolvedValue(undefined), dispose: jest.fn() }
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
    removeSyncedTombstones: jest.fn().mockResolvedValue([]),
    getLegacyClaims: jest.fn().mockResolvedValue([]),
    claimLegacySnapshot: jest.fn().mockResolvedValue(true),
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
  payload: { user_id: 'user-1', title: 'Title', description: 'Desc', tags: ['t'] },
  clientUpdatedAt: '2024-01-01T00:00:00Z',
  status: 'pending',
  ...overrides,
})

function renderSyncHook(mutations: {
  create?: jest.Mock
  update?: jest.Mock
  delete?: jest.Mock
  verify?:jest.Mock
  onVerifiedCreateRetry?: jest.Mock
} = {}) {
  return renderHook(() =>
    useNoteSync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-1' } as any,
      createNoteMutation: { mutateAsync: mutations.create ?? jest.fn() },
      updateNoteMutation: { mutateAsync: mutations.update ?? jest.fn() },
      deleteNoteMutation: { mutateAsync: mutations.delete ?? jest.fn() },
      verifyLegacyNotes:mutations.verify,
      onVerifiedCreateRetry: mutations.onVerifiedCreateRetry,
    }),
  )
}

// ---------------------------------------------------------------------------
// Tests — only the performSync callback of the sync manager.
// handleSaveNote upsert and resolveOpenableNote are tested elsewhere.
// ---------------------------------------------------------------------------

afterEach(async () => { await act(async () => {}) })

describe('useNoteSync — performSync upsert', () => {
  it('uses its acknowledged update version when a deletion follows an in-flight save',async()=>{
    const update=jest.fn().mockResolvedValue({ id:'note-1',updated_at:'2026-11-05T12:00:00Z' })
    const remove=jest.fn().mockResolvedValue('note-1')
    renderSyncHook({ update,delete:remove })
    await act(async()=>{
      await capturedPerformSync!(makeQueueItem())
      await capturedPerformSync!(makeQueueItem({ operation:'delete',payload:{ user_id:'user-1',title:'Title',description:'Desc',tags:['t'],base_updated_at:'2024-01-01' } }))
    })
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt:'2026-11-05T12:00:00Z' }))
  })
  it('delivers the complete deletion snapshot before acknowledging the queue item', async () => {
    const remove=jest.fn().mockResolvedValue('note-1')
    renderSyncHook({ delete:remove })
    await capturedPerformSync!(makeQueueItem({ operation:'delete' }))
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({
      id:'note-1',snapshot:expect.objectContaining({ title:'Title',description:'Desc',tags:['t'] }),
    }))
  })
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

  it('keeps a missing remote update for explicit recovery instead of recreating it', async () => {
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })
    const update = jest.fn().mockRejectedValue(pgrst116)
    const create = jest.fn().mockResolvedValue({})
    renderSyncHook({ update, create })

    await expect(capturedPerformSync!(makeQueueItem())).rejects.toThrow('unavailable on the server')

    expect(update).toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
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
  it('does not overwrite a restored or changed note just because a create ID already exists',async()=>{
    const create=jest.fn().mockRejectedValue({code:'23505'})
    const update=jest.fn()
    const onVerifiedCreateRetry = jest.fn()
    renderSyncHook({create,update,onVerifiedCreateRetry})
    await expect(capturedPerformSync!(makeQueueItem({operation:'create'}))).rejects.toThrow(/exists|verify|local/i)
    expect(update).not.toHaveBeenCalled()
    expect(onVerifiedCreateRetry).not.toHaveBeenCalled()
  })
  it('uses the local ID and suppresses background notifications', async () => {
    const create = jest.fn().mockResolvedValue({})
    renderSyncHook({ create })
    await capturedPerformSync!(makeQueueItem({ operation: 'create' }))
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', silent: true }))
  })

  it('refreshes history for a proven identical create retry without rewriting the server', async () => {
    const create = jest.fn().mockRejectedValue({ code: '23505' })
    const update = jest.fn().mockResolvedValue({})
    const verify=jest.fn().mockResolvedValue([{id:'note-1',user_id:'user-1',title:'Title',description:'Desc',tags:['t'],updated_at:'2026-11-05'}])
    const onVerifiedCreateRetry = jest.fn().mockRejectedValue(new Error('history unavailable'))
    renderSyncHook({ create, update, verify, onVerifiedCreateRetry })
    await capturedPerformSync!(makeQueueItem({ operation: 'create' }))
    expect(verify).toHaveBeenCalledWith(['note-1'],'user-1')
    expect(update).not.toHaveBeenCalled()
    expect(onVerifiedCreateRetry).toHaveBeenCalledWith('user-1', 'note-1')
  })

  it('keeps a missing remote update queued by propagating its error', async () => {
    renderSyncHook({ update: jest.fn().mockRejectedValue({ code: 'PGRST116' }), create: jest.fn().mockRejectedValue(new Error('network unavailable')) })
    await expect(capturedPerformSync!(makeQueueItem())).rejects.toThrow('unavailable on the server')
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

it('keeps another account\'s queued deletion from reaching the API', async () => {
  const remove = jest.fn()
  renderSyncHook({ delete: remove })
  await expect(capturedPerformSync!(makeQueueItem({ operation: 'delete', payload: { user_id: 'other-user' } })))
    .rejects.toThrow('another account')
  expect(remove).not.toHaveBeenCalled()
})

it('requests another drain after enqueueing an online batch', async () => {
  const { OfflineSyncManager } = await import('@core/services/offlineSyncManager')
  const hook = renderSyncHook()
  const manager = jest.mocked(OfflineSyncManager).mock.results.at(-1)?.value
  const item = makeQueueItem({ operation: 'delete', payload: { user_id: 'user-1' } })

  await act(async () => { await hook.result.current.enqueueBatchAndDrainIfOnline([item]) })

  expect(hook.result.current.offlineQueue.enqueueMany).toHaveBeenCalledWith([item])
  expect(manager.requestDrain).toHaveBeenCalledTimes(1)
})

it('persists and applies a local deletion before asking the scoped manager to drain', async () => {
  const { OfflineSyncManager } = await import('@core/services/offlineSyncManager')
  const { result } = renderSyncHook()
  const manager = jest.mocked(OfflineSyncManager).mock.results.at(-1)!.value
  const order: string[] = []
  manager.requestDrain.mockImplementation(async () => { order.push('drain') })
  jest.mocked(result.current.offlineQueue.enqueue).mockImplementation(async () => { order.push('enqueue') })
  await act(async () => {
    await result.current.enqueueMutation(makeQueueItem({ operation: 'delete' }), async () => { order.push('apply local') })
  })
  expect(order).toEqual(['enqueue', 'apply local', 'drain'])
})

it('logs a background drain failure without rejecting the durable enqueue', async () => {
  const { OfflineSyncManager } = await import('@core/services/offlineSyncManager')
  const hook = renderSyncHook()
  const manager = jest.mocked(OfflineSyncManager).mock.results.at(-1)?.value
  const error = new Error('queue read failed')
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  manager.requestDrain.mockRejectedValueOnce(error)
  try {
    await act(async () => {
      await expect(hook.result.current.enqueueBatchAndDrainIfOnline([makeQueueItem()])).resolves.toBeUndefined()
    })
    expect(hook.result.current.offlineQueue.enqueueMany).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('Background note sync will retry:', error)
  } finally {
    warn.mockRestore()
  }
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
