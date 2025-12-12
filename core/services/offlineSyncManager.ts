import type {
  MutationQueueItem,
  MutationQueueItemInput,
  SyncState,
  OfflineStorageAdapter,
  NetworkStatusProvider,
} from '../types/offline'
import { OfflineQueueService } from './offlineQueue'

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

  async drainQueue(options?: SyncOptions): Promise<void> {
    if (!this.online) return
    if (this.draining) return // Prevent parallel drain calls

    this.draining = true
    try {
      const batchSize = options?.batchSize ?? 10

      while (this.online) {
        // Get pending items WITHOUT removing them from queue
        const batch = await this.queue.getPendingBatch(batchSize)
        if (!batch.length) break

        const successIds: string[] = []
        let hadProgress = false

        for (const item of batch) {
          try {
            await this.performSync(item)
            // Sync successful - mark for removal
            successIds.push(item.id)
            hadProgress = true
            // Call onSuccess for UI updates (errors here don't affect queue)
            const onSuccess = options?.onSuccess ?? this.defaultOnSuccess
            if (onSuccess) {
              try {
                await onSuccess(item)
              } catch (e) {
                console.warn('onSuccess callback error (sync was successful):', e)
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown sync error'
            // Mark as failed but keep in queue for retry
            await this.queue.markStatus(item.id, 'failed', message)
          }
        }

        // Remove successfully synced items from queue
        if (successIds.length > 0) {
          await this.queue.removeItems(successIds)
        }

        // If no progress was made, stop to avoid infinite loop
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
