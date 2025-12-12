import type {
  MutationQueueItem,
  MutationQueueItemInput,
  MutationStatus,
  OfflineStorageAdapter,
} from '../types/offline'

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `mq_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export class OfflineQueueService {
  constructor(private readonly storage: OfflineStorageAdapter) {}

  async enqueue(item: MutationQueueItemInput): Promise<void> {
    const queueItem: MutationQueueItem = {
      id: item.id ?? generateId(),
      status: item.status ?? 'pending',
      attempts: item.attempts ?? 0,
      lastError: item.lastError,
      noteId: item.noteId,
      operation: item.operation,
      payload: item.payload,
      clientUpdatedAt: item.clientUpdatedAt,
    }
    await this.storage.upsertQueueItem(queueItem)
  }

  async enqueueMany(items: MutationQueueItemInput[]): Promise<void> {
    const queue = items.map<MutationQueueItem>((item) => ({
      id: item.id ?? generateId(),
      status: item.status ?? 'pending',
      attempts: item.attempts ?? 0,
      lastError: item.lastError,
      noteId: item.noteId,
      operation: item.operation,
      payload: item.payload,
      clientUpdatedAt: item.clientUpdatedAt,
    }))
    await this.storage.upsertQueue(queue)
  }

  async getQueue(): Promise<MutationQueueItem[]> {
    return this.storage.getQueue()
  }

  /** @deprecated Use getPendingBatch + removeItems instead */
  async popBatch(batchSize = 10): Promise<MutationQueueItem[]> {
    return this.storage.popQueueBatch(batchSize)
  }

  /** Get pending items without removing them */
  async getPendingBatch(batchSize = 10): Promise<MutationQueueItem[]> {
    return this.storage.getPendingBatch(batchSize)
  }

  /** Remove items from queue after successful sync */
  async removeItems(ids: string[]): Promise<void> {
    await this.storage.removeQueueItems(ids)
  }

  async markStatus(id: string, status: MutationStatus, lastError?: string): Promise<void> {
    await this.storage.markQueueItemStatus(id, status, lastError)
  }
}
