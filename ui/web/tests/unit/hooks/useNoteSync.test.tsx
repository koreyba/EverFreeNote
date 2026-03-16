import { renderHook } from '@testing-library/react'
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

  it('falls back to create with same ID when update fails (remote deletion)', async () => {
    const update = jest.fn().mockRejectedValue(new Error('PGRST116'))
    const create = jest.fn().mockResolvedValue({})
    renderSyncHook({ update, create })

    await capturedPerformSync!(makeQueueItem())

    expect(update).toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', userId: 'user-1', title: 'Title' }),
    )
  })

  it('throws when user is not authenticated', async () => {
    renderHook(() =>
      useNoteSync({
        user: null,
        createNoteMutation: { mutateAsync: jest.fn() },
        updateNoteMutation: { mutateAsync: jest.fn() },
        deleteNoteMutation: { mutateAsync: jest.fn() },
      }),
    )

    await expect(
      capturedPerformSync!(makeQueueItem()),
    ).rejects.toThrow('User not authenticated')
  })
})
