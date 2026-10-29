import { compactQueue } from '../utils/compactQueue'
import type {
  MutationQueueItem,
  MutationQueueItemInput,
  MutationStatus,
  OfflineStorageAdapter,
} from '../types/offline'

let fallbackCounter = 0

const generateId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint32Array(1)
    globalThis.crypto.getRandomValues(array)
    return `mq_${Date.now()}_${array[0].toString(16)}`
  }
  fallbackCounter = (fallbackCounter + 1) & 0xffffff
  return `mq_${Date.now()}_${fallbackCounter.toString(16)}`
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
    if (this.storage.appendQueueItems) {
      await this.storage.appendQueueItems(queue)
    } else {
      // Older adapters can still preserve existing items, although only adapters
      // with appendQueueItems can guarantee an atomic batch.
      for (const entry of queue) await this.storage.upsertQueueItem(entry)
    }
  }

  async getQueue(): Promise<MutationQueueItem[]> {
    return this.storage.getQueue()
  }

  async upsertQueue(items: MutationQueueItem[]): Promise<void> {
    await this.storage.upsertQueue(items)
  }

  async compact(): Promise<void> {
    const snapshot = await this.storage.getQueue()
    const compacted = compactQueue(snapshot)
    await this.replaceSnapshot(snapshot, compacted)
  }

  /** Reconcile a deletion with writes that arrived while a batch was in flight. */
  async compactNote(noteId: string): Promise<boolean> {
    const snapshot = (await this.storage.getQueue()).filter((item) => item.noteId === noteId)
    if (snapshot.length < 2) return false
    const compacted = compactQueue(snapshot)
    // Conflicting owners are intentionally kept separate.
    if (compacted.length >= snapshot.length) return false
    await this.replaceSnapshot(snapshot, compacted)
    return true
  }

  private async replaceSnapshot(snapshot: MutationQueueItem[], compacted: MutationQueueItem[]): Promise<void> {
    // Never replace the entire queue: a newer edit may arrive after the read.
    for (const item of compacted) await this.storage.upsertQueueItem(item)
    const retainedIds = new Set(compacted.map((item) => item.id))
    const obsoleteIds = snapshot.filter((item) => !retainedIds.has(item.id)).map((item) => item.id)
    if (obsoleteIds.length) await this.storage.removeQueueItems(obsoleteIds)
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
