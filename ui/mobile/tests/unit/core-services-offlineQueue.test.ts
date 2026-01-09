import { OfflineQueueService } from '@core/services/offlineQueue'
import type {
  OfflineStorageAdapter,
  MutationQueueItem,
  MutationQueueItemInput,
} from '@core/types/offline'

describe('core/services/offlineQueue', () => {
  let service: OfflineQueueService
  let mockStorage: jest.Mocked<OfflineStorageAdapter>

  beforeEach(() => {
    mockStorage = {
      loadNotes: jest.fn(),
      saveNote: jest.fn(),
      saveNotes: jest.fn(),
      deleteNote: jest.fn(),
      markSynced: jest.fn(),
      enforceLimit: jest.fn(),
      getQueue: jest.fn(),
      upsertQueueItem: jest.fn(),
      upsertQueue: jest.fn(),
      popQueueBatch: jest.fn(),
      getPendingBatch: jest.fn(),
      removeQueueItems: jest.fn(),
      markQueueItemStatus: jest.fn(),
      clearAll: jest.fn(),
    }

    service = new OfflineQueueService(mockStorage)
  })

  describe('enqueue', () => {
    it('enqueues item with all fields provided', async () => {
      const input: MutationQueueItemInput = {
        id: 'queue-1',
        noteId: 'note-1',
        operation: 'create',
        payload: { title: 'New Note' },
        clientUpdatedAt: '2024-01-01T00:00:00Z',
        status: 'pending',
        attempts: 0,
      }

      mockStorage.upsertQueueItem.mockResolvedValue()

      await service.enqueue(input)

      expect(mockStorage.upsertQueueItem).toHaveBeenCalledWith({
        id: 'queue-1',
        noteId: 'note-1',
        operation: 'create',
        payload: { title: 'New Note' },
        clientUpdatedAt: '2024-01-01T00:00:00Z',
        status: 'pending',
        attempts: 0,
      })
    })

    it('generates id when not provided', async () => {
      const input: MutationQueueItemInput = {
        noteId: 'note-1',
        operation: 'update',
        payload: { title: 'Updated' },
        clientUpdatedAt: '2024-01-01T00:00:00Z',
      }

      mockStorage.upsertQueueItem.mockResolvedValue()

      await service.enqueue(input)

      expect(mockStorage.upsertQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          noteId: 'note-1',
          operation: 'update',
          payload: { title: 'Updated' },
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
          attempts: 0,
        })
      )

      const call = mockStorage.upsertQueueItem.mock.calls[0][0]
      expect(call.id).toBeTruthy()
      expect(call.id.length).toBeGreaterThan(0)
    })

    it('defaults status to pending when not provided', async () => {
      const input: MutationQueueItemInput = {
        noteId: 'note-1',
        operation: 'delete',
        payload: {},
        clientUpdatedAt: '2024-01-01T00:00:00Z',
      }

      mockStorage.upsertQueueItem.mockResolvedValue()

      await service.enqueue(input)

      expect(mockStorage.upsertQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      )
    })

    it('defaults attempts to 0 when not provided', async () => {
      const input: MutationQueueItemInput = {
        noteId: 'note-1',
        operation: 'create',
        payload: {},
        clientUpdatedAt: '2024-01-01T00:00:00Z',
      }

      mockStorage.upsertQueueItem.mockResolvedValue()

      await service.enqueue(input)

      expect(mockStorage.upsertQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 0,
        })
      )
    })

    it('handles lastError field', async () => {
      const input: MutationQueueItemInput = {
        noteId: 'note-1',
        operation: 'update',
        payload: {},
        clientUpdatedAt: '2024-01-01T00:00:00Z',
        lastError: 'Network timeout',
      }

      mockStorage.upsertQueueItem.mockResolvedValue()

      await service.enqueue(input)

      expect(mockStorage.upsertQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          lastError: 'Network timeout',
        })
      )
    })

    it('propagates storage errors', async () => {
      const input: MutationQueueItemInput = {
        noteId: 'note-1',
        operation: 'create',
        payload: {},
        clientUpdatedAt: '2024-01-01T00:00:00Z',
      }

      const error = new Error('Storage error')
      mockStorage.upsertQueueItem.mockRejectedValue(error)

      await expect(service.enqueue(input)).rejects.toThrow('Storage error')
    })
  })

  describe('enqueueMany', () => {
    it('enqueues multiple items', async () => {
      const inputs: MutationQueueItemInput[] = [
        {
          noteId: 'note-1',
          operation: 'create',
          payload: { title: 'Note 1' },
          clientUpdatedAt: '2024-01-01T00:00:00Z',
        },
        {
          noteId: 'note-2',
          operation: 'update',
          payload: { title: 'Note 2' },
          clientUpdatedAt: '2024-01-02T00:00:00Z',
        },
      ]

      mockStorage.upsertQueue.mockResolvedValue()

      await service.enqueueMany(inputs)

      expect(mockStorage.upsertQueue).toHaveBeenCalledWith([
        expect.objectContaining({
          noteId: 'note-1',
          operation: 'create',
          status: 'pending',
          attempts: 0,
        }),
        expect.objectContaining({
          noteId: 'note-2',
          operation: 'update',
          status: 'pending',
          attempts: 0,
        }),
      ])
    })

    it('generates unique ids for each item', async () => {
      const inputs: MutationQueueItemInput[] = [
        {
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
        },
        {
          noteId: 'note-2',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      mockStorage.upsertQueue.mockResolvedValue()

      await service.enqueueMany(inputs)

      const call = mockStorage.upsertQueue.mock.calls[0][0]
      expect(call[0].id).toBeTruthy()
      expect(call[1].id).toBeTruthy()
      expect(call[0].id).not.toBe(call[1].id)
    })

    it('enqueues empty array', async () => {
      mockStorage.upsertQueue.mockResolvedValue()

      await service.enqueueMany([])

      expect(mockStorage.upsertQueue).toHaveBeenCalledWith([])
    })
  })

  describe('getQueue', () => {
    it('returns queue items', async () => {
      const items: MutationQueueItem[] = [
        {
          id: 'queue-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
          attempts: 0,
        },
      ]

      mockStorage.getQueue.mockResolvedValue(items)

      const result = await service.getQueue()

      expect(result).toEqual(items)
      expect(mockStorage.getQueue).toHaveBeenCalled()
    })

    it('returns empty array when queue is empty', async () => {
      mockStorage.getQueue.mockResolvedValue([])

      const result = await service.getQueue()

      expect(result).toEqual([])
    })
  })

  describe('upsertQueue', () => {
    it('upserts queue items', async () => {
      const items: MutationQueueItem[] = [
        {
          id: 'queue-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
          attempts: 1,
        },
      ]

      mockStorage.upsertQueue.mockResolvedValue()

      await service.upsertQueue(items)

      expect(mockStorage.upsertQueue).toHaveBeenCalledWith(items)
    })
  })

  describe('getPendingBatch', () => {
    it('gets pending batch with default size', async () => {
      const items: MutationQueueItem[] = [
        {
          id: 'queue-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
          attempts: 0,
        },
      ]

      mockStorage.getPendingBatch.mockResolvedValue(items)

      const result = await service.getPendingBatch()

      expect(result).toEqual(items)
      expect(mockStorage.getPendingBatch).toHaveBeenCalledWith(10)
    })

    it('gets pending batch with custom size', async () => {
      const items: MutationQueueItem[] = []

      mockStorage.getPendingBatch.mockResolvedValue(items)

      const result = await service.getPendingBatch(5)

      expect(result).toEqual(items)
      expect(mockStorage.getPendingBatch).toHaveBeenCalledWith(5)
    })
  })

  describe('removeItems', () => {
    it('removes items by ids', async () => {
      mockStorage.removeQueueItems.mockResolvedValue()

      await service.removeItems(['queue-1', 'queue-2'])

      expect(mockStorage.removeQueueItems).toHaveBeenCalledWith(['queue-1', 'queue-2'])
    })

    it('removes single item', async () => {
      mockStorage.removeQueueItems.mockResolvedValue()

      await service.removeItems(['queue-1'])

      expect(mockStorage.removeQueueItems).toHaveBeenCalledWith(['queue-1'])
    })

    it('handles empty array', async () => {
      mockStorage.removeQueueItems.mockResolvedValue()

      await service.removeItems([])

      expect(mockStorage.removeQueueItems).toHaveBeenCalledWith([])
    })
  })

  describe('markStatus', () => {
    it('marks status without error', async () => {
      mockStorage.markQueueItemStatus.mockResolvedValue()

      await service.markStatus('queue-1', 'synced')

      expect(mockStorage.markQueueItemStatus).toHaveBeenCalledWith('queue-1', 'synced', undefined)
    })

    it('marks status with error', async () => {
      mockStorage.markQueueItemStatus.mockResolvedValue()

      await service.markStatus('queue-1', 'failed', 'Network error')

      expect(mockStorage.markQueueItemStatus).toHaveBeenCalledWith(
        'queue-1',
        'failed',
        'Network error'
      )
    })

    it('marks status as pending', async () => {
      mockStorage.markQueueItemStatus.mockResolvedValue()

      await service.markStatus('queue-1', 'pending')

      expect(mockStorage.markQueueItemStatus).toHaveBeenCalledWith('queue-1', 'pending', undefined)
    })
  })

  describe('popBatch (deprecated)', () => {
    it('pops batch with default size', async () => {
      const items: MutationQueueItem[] = [
        {
          id: 'queue-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
          attempts: 0,
        },
      ]

      mockStorage.popQueueBatch.mockResolvedValue(items)

      const result = await service.popBatch()

      expect(result).toEqual(items)
      expect(mockStorage.popQueueBatch).toHaveBeenCalledWith(10)
    })

    it('pops batch with custom size', async () => {
      const items: MutationQueueItem[] = []

      mockStorage.popQueueBatch.mockResolvedValue(items)

      const result = await service.popBatch(20)

      expect(result).toEqual(items)
      expect(mockStorage.popQueueBatch).toHaveBeenCalledWith(20)
    })
  })
})
