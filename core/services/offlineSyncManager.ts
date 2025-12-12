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

  constructor(
    storage: OfflineStorageAdapter,
    private readonly performSync: PerformSync,
    networkStatus?: NetworkStatusProvider
  ) {
    this.queue = new OfflineQueueService(storage)
    this.online = networkStatus ? networkStatus.isOnline() : true
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

    const batchSize = options?.batchSize ?? 10

    // Заводим цикл, но выходим, если нет прогресса, чтобы избежать бесконечного повторения
    let madeProgress = false
    while (this.online) {
      const batch = await this.queue.popBatch(batchSize)
      if (!batch.length) break

      for (const item of batch) {
        try {
          await this.performSync(item)
          await this.queue.markStatus(item.id, 'synced')
          if (options?.onSuccess) {
            await options.onSuccess(item)
          }
          madeProgress = true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown sync error'
          await this.queue.markStatus(item.id, 'failed', message)
        }
      }

      if (!madeProgress) break
      this.lastSyncAt = new Date().toISOString()
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
