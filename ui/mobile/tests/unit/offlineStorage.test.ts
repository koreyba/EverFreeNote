import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import { mobileOfflineStorageAdapter } from '../../adapters/offlineStorage'
import { databaseService } from '../../services/database'

const mockDb = {
  runAsync: jest.fn().mockResolvedValue(undefined),
  execAsync: jest.fn().mockResolvedValue(undefined),
}

jest.mock('../../services/database', () => ({
  databaseService: {
    init: jest.fn().mockResolvedValue(mockDb),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getQueue: jest.fn().mockResolvedValue([]),
    upsertQueueItem: jest.fn().mockResolvedValue(undefined),
    removeQueueItems: jest.fn().mockResolvedValue(undefined),
    markQueueItemStatus: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('mobileOfflineStorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(databaseService.init as jest.Mock).mockResolvedValue(mockDb)
    mockDb.runAsync.mockResolvedValue(undefined)
    mockDb.execAsync.mockResolvedValue(undefined)
  })

  describe('loadNotes', () => {
    it('returns an empty array', async () => {
      const result = await mobileOfflineStorageAdapter.loadNotes()
      expect(result).toEqual([])
    })

    it('returns an empty array when params are provided', async () => {
      const result = await mobileOfflineStorageAdapter.loadNotes({ limit: 10, offset: 0 })
      expect(result).toEqual([])
    })
  })

  describe('saveNote', () => {
    it('delegates to databaseService.saveNotes with single note array', async () => {
      const note: CachedNote = {
        id: 'note-1',
        title: 'Test Note',
        status: 'synced',
        updatedAt: '2026-07-24T12:00:00.000Z',
      }

      await mobileOfflineStorageAdapter.saveNote(note)

      expect(databaseService.saveNotes).toHaveBeenCalledTimes(1)
      expect(databaseService.saveNotes).toHaveBeenCalledWith([note])
    })
  })

  describe('saveNotes', () => {
    it('delegates to databaseService.saveNotes with notes array', async () => {
      const notes: CachedNote[] = [
        { id: 'note-1', title: 'Note 1', status: 'synced', updatedAt: '2026-07-24T12:00:00.000Z' },
        { id: 'note-2', title: 'Note 2', status: 'pending', updatedAt: '2026-07-24T12:01:00.000Z' },
      ]

      await mobileOfflineStorageAdapter.saveNotes(notes)

      expect(databaseService.saveNotes).toHaveBeenCalledTimes(1)
      expect(databaseService.saveNotes).toHaveBeenCalledWith(notes)
    })

    it('handles empty notes array', async () => {
      await mobileOfflineStorageAdapter.saveNotes([])

      expect(databaseService.saveNotes).toHaveBeenCalledTimes(1)
      expect(databaseService.saveNotes).toHaveBeenCalledWith([])
    })
  })

  describe('deleteNote', () => {
    it('updates is_deleted = 1 for given noteId in DB', async () => {
      await mobileOfflineStorageAdapter.deleteNote('note-123')

      expect(databaseService.init).toHaveBeenCalledTimes(1)
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE notes SET is_deleted = 1 WHERE id = ?',
        ['note-123']
      )
    })
  })

  describe('getQueue', () => {
    it('delegates to databaseService.getQueue', async () => {
      const queueItems: MutationQueueItem[] = [
        {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: { title: 'Test' },
          clientUpdatedAt: '2026-07-24T12:00:00.000Z',
          status: 'pending',
        },
      ]
      ;(databaseService.getQueue as jest.Mock).mockResolvedValueOnce(queueItems)

      const result = await mobileOfflineStorageAdapter.getQueue()

      expect(databaseService.getQueue).toHaveBeenCalledTimes(1)
      expect(result).toEqual(queueItems)
    })
  })

  describe('upsertQueueItem', () => {
    it('delegates to databaseService.upsertQueueItem', async () => {
      const item: MutationQueueItem = {
        id: 'q-1',
        noteId: 'note-1',
        operation: 'update',
        payload: { title: 'Updated' },
        clientUpdatedAt: '2026-07-24T12:00:00.000Z',
        status: 'pending',
      }

      await mobileOfflineStorageAdapter.upsertQueueItem(item)

      expect(databaseService.upsertQueueItem).toHaveBeenCalledTimes(1)
      expect(databaseService.upsertQueueItem).toHaveBeenCalledWith(item)
    })
  })

  describe('upsertQueue', () => {
    it('calls upsertQueueItem for each item in array', async () => {
      const items: MutationQueueItem[] = [
        {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: { title: 'Note 1' },
          clientUpdatedAt: '2026-07-24T12:00:00.000Z',
          status: 'pending',
        },
        {
          id: 'q-2',
          noteId: 'note-2',
          operation: 'delete',
          payload: {},
          clientUpdatedAt: '2026-07-24T12:01:00.000Z',
          status: 'pending',
        },
      ]

      await mobileOfflineStorageAdapter.upsertQueue(items)

      expect(databaseService.upsertQueueItem).toHaveBeenCalledTimes(2)
      expect(databaseService.upsertQueueItem).toHaveBeenNthCalledWith(1, items[0])
      expect(databaseService.upsertQueueItem).toHaveBeenNthCalledWith(2, items[1])
    })

    it('does not call upsertQueueItem for empty array', async () => {
      await mobileOfflineStorageAdapter.upsertQueue([])

      expect(databaseService.upsertQueueItem).not.toHaveBeenCalled()
    })
  })

  describe('getPendingBatch', () => {
    it('filters queue items for pending status and respects batch size limit', async () => {
      const queueItems: MutationQueueItem[] = [
        {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        },
        {
          id: 'q-2',
          noteId: 'note-2',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '101',
          status: 'failed',
        },
        {
          id: 'q-3',
          noteId: 'note-3',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '102',
          status: 'pending',
        },
        {
          id: 'q-4',
          noteId: 'note-4',
          operation: 'delete',
          payload: {},
          clientUpdatedAt: '103',
          status: 'pending',
        },
      ]
      ;(databaseService.getQueue as jest.Mock).mockResolvedValueOnce(queueItems)

      const result = await mobileOfflineStorageAdapter.getPendingBatch(2)

      expect(databaseService.getQueue).toHaveBeenCalledTimes(1)
      expect(result).toEqual([queueItems[0], queueItems[2]])
    })

    it('returns empty array when queue is empty', async () => {
      ;(databaseService.getQueue as jest.Mock).mockResolvedValueOnce([])

      const result = await mobileOfflineStorageAdapter.getPendingBatch(5)

      expect(result).toEqual([])
    })
  })

  describe('removeQueueItems', () => {
    it('delegates to databaseService.removeQueueItems', async () => {
      const ids = ['q-1', 'q-2']

      await mobileOfflineStorageAdapter.removeQueueItems(ids)

      expect(databaseService.removeQueueItems).toHaveBeenCalledTimes(1)
      expect(databaseService.removeQueueItems).toHaveBeenCalledWith(ids)
    })
  })

  describe('markSynced', () => {
    it('updates is_synced and updated_at in DB for noteId', async () => {
      await mobileOfflineStorageAdapter.markSynced('note-1', '2026-07-24T12:00:00.000Z')

      expect(databaseService.init).toHaveBeenCalledTimes(1)
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE notes SET is_synced = 1, updated_at = ? WHERE id = ?',
        ['2026-07-24T12:00:00.000Z', 'note-1']
      )
    })
  })

  describe('markQueueItemStatus', () => {
    it('delegates status and error to databaseService.markQueueItemStatus', async () => {
      await mobileOfflineStorageAdapter.markQueueItemStatus('q-1', 'failed', 'Connection lost')

      expect(databaseService.markQueueItemStatus).toHaveBeenCalledTimes(1)
      expect(databaseService.markQueueItemStatus).toHaveBeenCalledWith('q-1', 'failed', 'Connection lost')
    })

    it('passes undefined for lastError if omitted', async () => {
      await mobileOfflineStorageAdapter.markQueueItemStatus('q-1', 'synced')

      expect(databaseService.markQueueItemStatus).toHaveBeenCalledTimes(1)
      expect(databaseService.markQueueItemStatus).toHaveBeenCalledWith('q-1', 'synced', undefined)
    })
  })

  describe('enforceLimit', () => {
    it('resolves without error', async () => {
      await expect(mobileOfflineStorageAdapter.enforceLimit()).resolves.toBeUndefined()
    })
  })

  describe('clearAll', () => {
    it('executes delete statements on notes and mutation_queue', async () => {
      await mobileOfflineStorageAdapter.clearAll()

      expect(databaseService.init).toHaveBeenCalledTimes(1)
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DELETE FROM notes; DELETE FROM mutation_queue;'
      )
    })
  })

  describe('popQueueBatch', () => {
    it('fetches pending batch, removes items by id, and returns batch', async () => {
      const pendingItems: MutationQueueItem[] = [
        {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        },
        {
          id: 'q-2',
          noteId: 'note-2',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '101',
          status: 'pending',
        },
      ]
      ;(databaseService.getQueue as jest.Mock).mockResolvedValueOnce(pendingItems)

      const result = await mobileOfflineStorageAdapter.popQueueBatch(2)

      expect(result).toEqual(pendingItems)
      expect(databaseService.removeQueueItems).toHaveBeenCalledWith(['q-1', 'q-2'])
    })

    it('returns empty array and removes empty array when no pending items exist', async () => {
      ;(databaseService.getQueue as jest.Mock).mockResolvedValueOnce([])

      const result = await mobileOfflineStorageAdapter.popQueueBatch(2)

      expect(result).toEqual([])
      expect(databaseService.removeQueueItems).toHaveBeenCalledWith([])
    })
  })
})
