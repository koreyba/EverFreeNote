import type {
  MutationQueueItem,
  MutationQueueItemInput,
  SyncState,
  OfflineStorageAdapter,
  NetworkStatusProvider,
} from '../types/offline'
import { OfflineQueueService } from './offlineQueue'
import { compactQueue } from '../utils/compactQueue'

type PerformSync = (item: MutationQueueItem) => Promise<void>

interface SyncOptions {
  batchSize?: number
  onSuccess?: (item: MutationQueueItem) => Promise<void> | void
}

export class OfflineSyncManager {
  private readonly queue: OfflineQueueService
  private lastSyncAt?: string
  private online: boolean
  private unsubscribe?: () => void
  private defaultOnSuccess?: (item: MutationQueueItem) => Promise<void> | void
  private draining: boolean = false

  constructor(
    storage: OfflineStorageAdapter,
    private readonly performSync: PerformSync,
    networkStatus?: NetworkStatusProvider,
    defaultOnSuccess?: (item: MutationQueueItem) => Promise<void> | void
  ) {
    this.queue = new OfflineQueueService(storage)
    this.online = networkStatus ? networkStatus.isOnline() : true
    this.defaultOnSuccess = defaultOnSuccess
    if (networkStatus) {
      this.unsubscribe = networkStatus.subscribe((isOnline) => {
        this.online = isOnline
        if (isOnline) {
          void this.drainQueue()
        }
      })
    }
  }

  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }

  async enqueue(item: MutationQueueItemInput): Promise<void> {
    await this.queue.enqueue(item)
    if (this.online) {
      void this.drainQueue()
    }
  }

  async handleOnline(): Promise<void> {
    this.online = true
    await this.drainQueue()
  }

  handleOffline(): void {
    this.online = false
  }

  private async processSyncItem(
    item: MutationQueueItem,
    options?: SyncOptions
  ): Promise<boolean> {
    try {
      await this.performSync(item)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error'
      await this.queue.markStatus(item.id, 'failed', message)
      return false
    }

    try {
      await this.queue.removeItems([item.id])
    } catch (cleanupError) {
      console.warn('Failed to remove item from offline queue after successful sync:', cleanupError)
    }

    const onSuccess = options?.onSuccess ?? this.defaultOnSuccess
    if (onSuccess) {
      try {
        await onSuccess(item)
      } catch (e) {
        console.warn('onSuccess callback error (sync was successful):', e)
      }
    }
    return true
  }

  private async processBatch(
    batch: MutationQueueItem[],
    options?: SyncOptions
  ): Promise<boolean> {
    let hadProgress = false
    for (const item of batch) {
      const success = await this.processSyncItem(item, options)
      if (success) {
        hadProgress = true
      }
    }
    return hadProgress
  }

  async drainQueue(options?: SyncOptions): Promise<void> {
    if (!this.online || this.draining) return

    this.draining = true
    try {
      const batchSize = options?.batchSize ?? 10
      const current = await this.queue.getQueue()
      const compacted = compactQueue(current)
      await this.queue.upsertQueue(compacted)

      while (this.online) {
        const batch = await this.queue.getPendingBatch(batchSize)
        if (!batch.length) break

        const hadProgress = await this.processBatch(batch, options)
        if (!hadProgress) break

        this.lastSyncAt = new Date().toISOString()
      }
    } finally {
      this.draining = false
    }
  }

  async getState(): Promise<SyncState> {
    const queue = await this.queue.getQueue()
    return {
      lastSyncAt: this.lastSyncAt,
      isOnline: this.online,
      queueSize: queue.length,
    }
  }
}
