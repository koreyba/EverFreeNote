import { OfflineQueueService } from '../../services/offlineQueue'
import { compactQueue } from '../../utils/compactQueue'
import type { MutationQueueItem, MutationQueueItemInput } from '../../types/offline'

const input = (
  id: string,
  noteId: string,
  operation: MutationQueueItemInput['operation'],
  time: string,
  overrides: Partial<MutationQueueItemInput> = {},
): MutationQueueItemInput => ({
  id,
  noteId,
  operation,
  payload: { title: id },
  clientUpdatedAt: time,
  ...overrides,
})

const item = (
  id: string,
  noteId: string,
  operation: MutationQueueItem['operation'],
  time: string,
  payload: Partial<MutationQueueItem> = {},
): MutationQueueItem => ({
  id,
  noteId,
  operation,
  payload,
  clientUpdatedAt: time,
  status: 'failed',
  attempts: 2,
})

describe('offline queue additional branches', () => {
  it('preserves retry metadata and input order when enqueueing a failed batch', async () => {
    const storage = {
      upsertQueueItem: jest.fn().mockResolvedValue(undefined),
      upsertQueue: jest.fn().mockResolvedValue(undefined),
    }
    const service = new OfflineQueueService(storage as never)
    const failed = input('retry-1', 'note-1', 'update', '2026-01-01T00:00:00Z', {
      status: 'failed',
      attempts: 3,
      lastError: 'network timeout',
    })

    await service.enqueue(failed)
    expect(storage.upsertQueueItem).toHaveBeenCalledWith({
      ...failed,
      status: 'failed',
      attempts: 3,
      lastError: 'network timeout',
    })

    const batch = [
      input('retry-2', 'note-2', 'create', '2026-01-01T00:00:01Z', { status: 'failed', attempts: 1, lastError: '503' }),
      input('retry-3', 'note-3', 'delete', '2026-01-01T00:00:02Z', { status: 'pending', attempts: 0 }),
    ]
    await service.enqueueMany(batch)

    expect(storage.upsertQueue).toHaveBeenCalledWith([
      { ...batch[0], status: 'failed', attempts: 1, lastError: '503' },
      { ...batch[1], status: 'pending', attempts: 0, lastError: undefined },
    ])
  })

  it('dequeues in order, excludes failed retries from pending batches, and reaches an empty state', async () => {
    const queue: MutationQueueItem[] = []
    const storage = {
      queue,
      upsertQueue: jest.fn(async (items: MutationQueueItem[]) => queue.push(...items)),
      upsertQueueItem: jest.fn(async (entry: MutationQueueItem) => queue.push(entry)),
      getQueue: jest.fn(async () => [...queue]),
      getPendingBatch: jest.fn(async (size: number) => queue.filter((entry) => entry.status === 'pending').slice(0, size)),
      popQueueBatch: jest.fn(async (size: number) => queue.splice(0, size)),
      removeQueueItems: jest.fn(async (ids: string[]) => {
        for (let index = queue.length - 1; index >= 0; index--) {
          if (ids.includes(queue[index].id)) queue.splice(index, 1)
        }
      }),
      markQueueItemStatus: jest.fn(async (id: string, status: MutationQueueItem['status'], lastError?: string) => {
        const entry = queue.find((candidate) => candidate.id === id)
        if (entry) Object.assign(entry, { status, lastError })
      }),
    }
    const service = new OfflineQueueService(storage as never)

    await service.enqueueMany([
      input('first', 'note-1', 'update', '2026-01-01T00:00:00Z'),
      input('failed', 'note-2', 'update', '2026-01-01T00:00:01Z', { status: 'failed', attempts: 2, lastError: 'timeout' }),
      input('last', 'note-3', 'delete', '2026-01-01T00:00:02Z'),
    ])

    await expect(service.getPendingBatch(10)).resolves.toEqual([
      expect.objectContaining({ id: 'first' }),
      expect.objectContaining({ id: 'last' }),
    ])
    await expect(service.popBatch(1)).resolves.toEqual([expect.objectContaining({ id: 'first' })])
    await service.markStatus('last', 'failed', 'server rejected delete')
    await expect(service.getPendingBatch()).resolves.toEqual([])
    await service.removeItems(['failed', 'last'])
    await expect(service.getQueue()).resolves.toEqual([])
    expect(storage.queue).toEqual([])
  })

  it('compacts create-update-delete to a noop and keeps the final operation for existing notes', () => {
    const result = compactQueue([
      item('create-1', 'new-note', 'create', '2026-01-01T00:00:00Z', { title: 'initial' }),
      item('update-1', 'new-note', 'update', '2026-01-01T00:00:01Z', { title: 'edited' }),
      item('delete-1', 'new-note', 'delete', '2026-01-01T00:00:02Z'),
      item('update-2', 'existing-delete', 'update', '2026-01-01T00:00:03Z', { title: 'before delete' }),
      item('delete-2', 'existing-delete', 'delete', '2026-01-01T00:00:04Z', { reason: 'removed' }),
    ])

    expect(result).toEqual([
      expect.objectContaining({
        id: 'delete-2',
        noteId: 'existing-delete',
        operation: 'delete',
        payload: { reason: 'removed' },
        status: 'pending',
      }),
    ])
  })

  it('keeps compacted notes in final timestamp order and returns an empty queue for no input', () => {
    const result = compactQueue([
      item('late', 'late-note', 'update', '2026-01-01T00:00:10Z', { title: 'late' }),
      item('early', 'early-note', 'delete', '2026-01-01T00:00:02Z'),
    ])

    expect(compactQueue([])).toEqual([])
    expect(result.map((entry) => entry.id)).toEqual(['early', 'late'])
    expect(result.every((entry) => entry.status === 'pending')).toBe(true)
  })

  it('propagates dequeue and retry status storage failures without changing the service contract', async () => {
    const error = new Error('queue storage unavailable')
    const storage = {
      getPendingBatch: jest.fn().mockRejectedValue(error),
      popQueueBatch: jest.fn().mockRejectedValue(error),
      removeQueueItems: jest.fn().mockRejectedValue(error),
      markQueueItemStatus: jest.fn().mockRejectedValue(error),
    }
    const service = new OfflineQueueService(storage as never)

    await expect(service.getPendingBatch()).rejects.toBe(error)
    await expect(service.popBatch()).rejects.toBe(error)
    await expect(service.removeItems(['missing'])).rejects.toBe(error)
    await expect(service.markStatus('missing', 'failed', 'retry failed')).rejects.toBe(error)
  })
})
