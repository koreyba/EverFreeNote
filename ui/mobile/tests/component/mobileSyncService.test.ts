import type { MutationQueueItem } from '@core/types/offline'

let capturedPerformSync: ((item: MutationQueueItem) => Promise<void>) | null = null

jest.mock('@core/services/offlineSyncManager', () => ({
  OfflineSyncManager: jest.fn().mockImplementation(
    (_storage: unknown, performSync: (item: MutationQueueItem) => Promise<void>) => {
      capturedPerformSync = performSync
      return {
        enqueue: jest.fn(),
        drainQueue: jest.fn(),
      }
    },
  ),
}))

jest.mock('@ui/mobile/adapters/offlineStorage', () => ({
  mobileOfflineStorageAdapter: {},
}))

jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNoteById: jest.fn().mockResolvedValue({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Existing body</p>',
      tags: ['tag1'],
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-01T10:00:00.000Z',
      user_id: 'test-user-id',
    }),
  },
}))

jest.mock('@core/services/notes')

import { databaseService } from '@ui/mobile/services/database'
import { MobileSyncService } from '@ui/mobile/services/sync'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const mockSaveNotes = databaseService.saveNotes as jest.Mock

describe('MobileSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedPerformSync = null
    mockNoteService.prototype.updateNote = jest.fn().mockResolvedValue({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
      user_id: 'test-user-id',
    })
    mockNoteService.prototype.createNote = jest.fn().mockResolvedValue({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
      user_id: 'test-user-id',
    })
  })

  it('re-creates a queued update with the same id when remote update returns PGRST116', async () => {
    const service = new MobileSyncService()
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })

    mockNoteService.prototype.updateNote = jest.fn().mockRejectedValue(pgrst116)

    service.init({} as never)

    await capturedPerformSync?.({
      id: 'queue-1',
      noteId: 'note-1',
      operation: 'update',
      payload: {
        description: '<p>Updated body</p>',
        user_id: 'test-user-id',
      },
      clientUpdatedAt: '2026-03-16T10:00:00.000Z',
      status: 'pending',
    })

    expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith('note-1', {
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
    })
    expect(mockNoteService.prototype.createNote).toHaveBeenCalledWith({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      userId: 'test-user-id',
    })
    expect(mockSaveNotes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'note-1',
        is_synced: 1,
        is_deleted: 0,
      }),
    ])
  })
})
