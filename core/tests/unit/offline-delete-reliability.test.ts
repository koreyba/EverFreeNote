import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { OfflineQueueService } from '@core/services/offlineQueue'
import type { MutationQueueItem, MutationStatus, OfflineStorageAdapter } from '@core/types/offline'

class MemoryStorage implements OfflineStorageAdapter {
  queue: MutationQueueItem[] = []
  async loadNotes() { return [] }
  async saveNote() {}
  async saveNotes() {}
  async deleteNote() {}
  async getQueue() { return [...this.queue] }
  async upsertQueueItem(item: MutationQueueItem) { this.queue = [...this.queue.filter(entry => entry.id !== item.id), item] }
  async upsertQueue(items: MutationQueueItem[]) { this.queue = [...items] }
  async popQueueBatch(size: number) { return this.getPendingBatch(size) }
  async getPendingBatch(size: number) {
    return this.queue.filter(item => item.status === 'pending').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt)).slice(0, size)
  }
  async removeQueueItems(ids: string[]) { this.queue = this.queue.filter(item => !ids.includes(item.id)) }
  async markSynced() {}
  async markQueueItemStatus(id: string, status: MutationStatus, lastError?: string) {
    const item = this.queue.find(entry => entry.id === id)
    if (item) Object.assign(item, { status, lastError })
  }
  async enforceLimit() {}
  async clearAll() { this.queue = [] }
}

const mutation = (id: string, noteId: string, operation: MutationQueueItem['operation'], time: string, payload: MutationQueueItem['payload'] = {}, status: MutationStatus = 'pending'): MutationQueueItem => ({
  id, noteId, operation, payload, status, clientUpdatedAt: time,
})
const network = { isOnline: () => false, subscribe: () => () => {} }
const create = () => mutation('create', 'note-1', 'create', '2026-01-01T00:00:01.000Z', { user_id: 'owner-a', title: 'note' }, 'failed')
const remove = () => mutation('delete', 'note-1', 'delete', '2026-01-01T00:00:02.000Z')

describe('offline deletion after an uncertain create', () => {
  it('removes the committed note using the same identity and preserves other notes', async () => {
    const storage = new MemoryStorage()
    storage.queue = [create(), remove()]
    const server = new Set(['note-1', 'other-note'])
    const calls: MutationQueueItem[] = []
    const manager = new OfflineSyncManager(storage, async item => { calls.push(item); server.delete(item.noteId) }, network)

    await manager.handleOnline()

    expect([...server]).toEqual(['other-note'])
    expect(calls).toEqual([expect.objectContaining({ operation: 'delete', noteId: 'note-1', payload: { user_id: 'owner-a' } })])
    expect(storage.queue).toEqual([])
    manager.dispose()
  })

  it('clears a deletion idempotently even when the create never reached the server', async () => {
    const storage = new MemoryStorage()
    storage.queue = [create(), remove()]
    const server = new Set<string>()
    const calls: string[] = []
    const manager = new OfflineSyncManager(storage, async item => { calls.push(item.operation); server.delete(item.noteId) }, network)

    await manager.handleOnline()

    expect(calls).toEqual(['delete'])
    expect(server.size).toBe(0)
    expect(storage.queue).toEqual([])
    manager.dispose()
  })

  it('retains a failed delete and retries it on the next drain', async () => {
    const storage = new MemoryStorage()
    storage.queue = [create(), remove()]
    const server = new Set(['note-1'])
    let calls = 0
    const manager = new OfflineSyncManager(storage, async item => {
      calls += 1
      if (calls === 1) throw new Error('response lost')
      server.delete(item.noteId)
    }, network)

    await manager.handleOnline()
    expect(server.has('note-1')).toBe(true)
    expect(storage.queue).toEqual([expect.objectContaining({ operation: 'delete', status: 'failed', payload: { user_id: 'owner-a' } })])
    await manager.drainQueue()
    expect(server.has('note-1')).toBe(false)
    expect(calls).toBe(2)
    expect(storage.queue).toEqual([])
    manager.dispose()
  })

  it('does not delete an earlier account\'s note after switching accounts', async () => {
    const storage = new MemoryStorage()
    storage.queue = [create(), remove()]
    const server = new Set(['note-1'])
    const calls: string[] = []
    let currentUser = 'owner-b'
    const manager = new OfflineSyncManager(storage, async item => {
      if (item.payload.user_id !== currentUser) throw new Error('Queued note belongs to another account')
      calls.push(item.operation)
      server.delete(item.noteId)
    }, network)

    await manager.handleOnline()
    expect(server.has('note-1')).toBe(true)
    expect(calls).toEqual([])
    expect(storage.queue).toEqual([expect.objectContaining({ operation: 'delete', status: 'failed', payload: { user_id: 'owner-a' } })])
    currentUser = 'owner-a'
    await manager.drainQueue()
    expect(server.has('note-1')).toBe(false)
    expect(storage.queue).toEqual([])
    manager.dispose()
  })

  it('finishes an in-flight create before the queued delete in the same manager', async () => {
    const storage = new MemoryStorage()
    storage.queue = [{ ...create(), status: 'pending' }]
    const server = new Set<string>()
    const calls: string[] = []
    let releaseCreate!: () => void
    let createStarted!: () => void
    const started = new Promise<void>(resolve => { createStarted = resolve })
    const gate = new Promise<void>(resolve => { releaseCreate = resolve })
    const manager = new OfflineSyncManager(storage, async item => {
      calls.push(item.operation)
      if (item.operation === 'create') {
        createStarted()
        await gate
        server.add(item.noteId)
      } else {
        server.delete(item.noteId)
      }
    }, network)

    const draining = manager.handleOnline()
    await started
    manager.handleOffline()
    await manager.enqueue(remove())
    const reconnect = manager.handleOnline()
    releaseCreate()
    await Promise.all([draining, reconnect])

    expect(calls).toEqual(['create', 'delete'])
    expect(server.has('note-1')).toBe(false)
    expect(storage.queue).toEqual([])
    manager.dispose()
  })
})


it('preserves unrelated pending saves when queueing a batch of offline deletions', async () => {
  const storage = new MemoryStorage()
  const original = mutation('existing', 'other-note', 'update', '2026-01-01T00:00:00.000Z', { user_id: 'owner-a', title: 'Keep my edits' })
  storage.queue = [original]
  const queue = new OfflineQueueService(storage)

  await queue.enqueueMany([
    { noteId: 'delete-1', operation: 'delete', payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-01-01T00:00:01.000Z' },
    { noteId: 'delete-2', operation: 'delete', payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-01-01T00:00:01.000Z' },
  ])

  expect(storage.queue).toEqual(expect.arrayContaining([original,
    expect.objectContaining({ noteId: 'delete-1', operation: 'delete' }),
    expect.objectContaining({ noteId: 'delete-2', operation: 'delete' }),
  ]))
})


it('does not leave a failed in-flight create behind a later queued delete while syncing other notes', async () => {
  const storage = new MemoryStorage()
  storage.queue = [{ ...create(), status: 'pending' }, mutation('other', 'other-note', 'update', '2026-01-01T00:00:03.000Z', { user_id: 'owner-a' })]
  const server = new Set<string>()
  let releaseCreate!: () => void
  let createStarted!: () => void
  const started = new Promise<void>(resolve => { createStarted = resolve })
  const gate = new Promise<void>(resolve => { releaseCreate = resolve })
  const calls: string[] = []
  const manager = new OfflineSyncManager(storage, async item => {
    calls.push(`${item.operation}:${item.noteId}`)
    if (item.noteId === 'note-1' && item.operation === 'create') {
      server.add(item.noteId)
      createStarted()
      await gate
      throw new Error('response lost after create')
    }
    if (item.operation === 'delete') server.delete(item.noteId)
  }, network)
  const draining = manager.handleOnline()
  await started
  await manager.enqueue(remove())
  releaseCreate()
  await draining

  expect(server.has('note-1')).toBe(false)
  expect(storage.queue).toEqual([])
  expect(calls).toEqual(['create:note-1', 'update:other-note', 'delete:note-1'])
  manager.dispose()
})

it('keeps a deletion when create and delete have the same timestamp regardless of storage order', async () => {
  const storage = new MemoryStorage()
  storage.queue = [
    { ...remove(), clientUpdatedAt: '2026-01-01T00:00:01.000Z' },
    { ...create(), status: 'pending' },
  ]
  const server = new Set(['note-1'])
  const calls: string[] = []
  const manager = new OfflineSyncManager(storage, async item => { calls.push(item.operation); if (item.operation === 'delete') server.delete(item.noteId) }, network)

  await manager.handleOnline()

  expect(calls).toEqual(['delete'])
  expect(server.has('note-1')).toBe(false)
  expect(storage.queue).toEqual([])
  manager.dispose()
})

it('does not collapse two explicit owners for the same note identifier', async () => {
  const storage = new MemoryStorage()
  storage.queue = [create(), { ...remove(), payload: { user_id: 'owner-b' } }]
  const server = new Map([['note-1', 'owner-a']])
  const manager = new OfflineSyncManager(storage, async item => {
    if (item.payload.user_id !== 'owner-b') throw new Error('Queued note belongs to another account')
    if (server.get(item.noteId) === 'owner-b') server.delete(item.noteId)
  }, network)

  await manager.handleOnline()

  expect(server.get('note-1')).toBe('owner-a')
  expect(storage.queue).toEqual([expect.objectContaining({ operation: 'create', status: 'failed', payload: expect.objectContaining({ user_id: 'owner-a' }) })])
  manager.dispose()
})

it('starts another drain when deletion arrives during the only in-flight create which fails', async () => {
  const storage = new MemoryStorage()
  storage.queue = [{ ...create(), status: 'pending' }]
  const server = new Set<string>()
  let releaseCreate!: () => void
  let createStarted!: () => void
  const started = new Promise<void>(resolve => { createStarted = resolve })
  const gate = new Promise<void>(resolve => { releaseCreate = resolve })
  const manager = new OfflineSyncManager(storage, async item => {
    if (item.operation === 'create') {
      server.add(item.noteId)
      createStarted()
      await gate
      throw new Error('response lost')
    }
    server.delete(item.noteId)
  }, network)
  const draining = manager.handleOnline()
  await started
  await manager.enqueue(remove())
  releaseCreate()
  await draining
  for (let i = 0; i < 30; i++) await Promise.resolve()

  expect(server.has('note-1')).toBe(false)
  expect(storage.queue).toEqual([])
  manager.dispose()
})
