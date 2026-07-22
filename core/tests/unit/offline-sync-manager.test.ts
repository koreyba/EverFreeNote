import type { MutationQueueItem, OfflineStorageAdapter } from '../../types/offline'
import { OfflineSyncManager } from '../../services/offlineSyncManager'

const item = (id: string, status: 'pending' | 'failed' = 'pending'): MutationQueueItem => ({
  id, noteId: `note-${id}`, operation: 'update', payload: {}, clientUpdatedAt: `2026-01-01T00:00:${id.padStart(2, '0')}Z`, status,
})

class MemoryStorage implements OfflineStorageAdapter {
  queue: MutationQueueItem[] = []
  async loadNotes() { return [] }
  async saveNote() {}
  async saveNotes() {}
  async deleteNote() {}
  async getQueue() { return this.queue }
  async upsertQueueItem(value: MutationQueueItem) { this.queue.push(value) }
  async upsertQueue(values: MutationQueueItem[]) { this.queue = values }
  async popQueueBatch(size: number) { return this.queue.slice(0, size) }
  async getPendingBatch(size: number) { return this.queue.filter((value) => value.status === 'pending').slice(0, size) }
  async removeQueueItems(ids: string[]) { this.queue = this.queue.filter((value) => !ids.includes(value.id)) }
  async markSynced() {}
  async markQueueItemStatus(id: string, status: 'pending' | 'failed', lastError?: string) {
    const found = this.queue.find((value) => value.id === id)
    if (found) Object.assign(found, { status, lastError })
  }
  async enforceLimit() {}
  async clearAll() { this.queue = [] }
}

describe('OfflineSyncManager', () => {
  it('compacts and drains successful items, invoking callbacks', async () => {
    const storage = new MemoryStorage()
    storage.queue = [item('1'), { ...item('1'), id: '2', payload: { title: 'latest' }, clientUpdatedAt: '2026-01-01T00:00:02Z' }]
    const performSync = jest.fn().mockResolvedValue(undefined)
    const onSuccess = jest.fn()
    const manager = new OfflineSyncManager(storage, performSync, undefined, onSuccess)
    await manager.drainQueue()
    expect(performSync).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    await expect(manager.getState()).resolves.toMatchObject({ isOnline: true, queueSize: 0 })
  })

  it('marks failed items and stops when no item progresses', async () => {
    const storage = new MemoryStorage()
    storage.queue = [item('1')]
    const manager = new OfflineSyncManager(storage, jest.fn().mockRejectedValue(new Error('offline'))) 
    await manager.drainQueue()
    expect(storage.queue[0]).toMatchObject({ status: 'failed', lastError: 'offline' })

    const failingStorage = new MemoryStorage()
    failingStorage.queue = [item('2')]
    const failingManager = new OfflineSyncManager(failingStorage, jest.fn().mockRejectedValue('unknown'))
    await failingManager.drainQueue()
    expect(failingStorage.queue[0].lastError).toBe('Unknown sync error')
  })

  it('honors offline state and handles online transitions', async () => {
    let listener: ((online: boolean) => void) | undefined
    const storage = new MemoryStorage()
    storage.queue = [item('1')]
    const subscribe = jest.fn((callback: (online: boolean) => void) => { listener = callback; return () => { listener = undefined } })
    const network = { isOnline: () => false, subscribe }
    const performSync = jest.fn().mockResolvedValue(undefined)
    const manager = new OfflineSyncManager(storage, performSync, network)
    await manager.drainQueue()
    expect(performSync).not.toHaveBeenCalled()
    await manager.handleOnline()
    expect(performSync).toHaveBeenCalledTimes(1)
    storage.queue = [item('2')]
    listener?.(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(performSync).toHaveBeenCalledTimes(2)
    manager.handleOffline()
    expect((await manager.getState()).isOnline).toBe(false)
    manager.dispose()
  })
})
