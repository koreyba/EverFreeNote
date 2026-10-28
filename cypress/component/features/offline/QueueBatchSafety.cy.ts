import { OfflineQueueService } from '@core/services/offlineQueue'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import type { MutationQueueItem } from '@core/types/offline'

const item = (id: string, status: MutationQueueItem['status'] = 'pending'): MutationQueueItem => ({
  id, noteId: id, operation: 'update', payload: { user_id: 'owner-a', title: `content-${id}` },
  status, clientUpdatedAt: '2026-01-01T00:00:00.000Z',
})

const deletes = [
  { noteId: 'delete-1', operation: 'delete' as const, payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-01-01T00:00:01.000Z' },
  { noteId: 'delete-2', operation: 'delete' as const, payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-01-01T00:00:01.000Z' },
]

describe('Offline bulk deletions preserve the durable queue', () => {
  beforeEach(() => cy.then(() => webOfflineStorageAdapter.clearAll()))
  afterEach(() => cy.then(() => webOfflineStorageAdapter.clearAll()))

  it('keeps pending and failed edits, including a concurrently enqueued save', () => {
    const queue = new OfflineQueueService(webOfflineStorageAdapter)
    cy.then(async () => {
      await webOfflineStorageAdapter.upsertQueueItem(item('pending'))
      await webOfflineStorageAdapter.upsertQueueItem(item('failed', 'failed'))
      await Promise.all([
        queue.enqueueMany(deletes),
        queue.enqueue({ noteId: 'concurrent', operation: 'update', payload: { user_id: 'owner-a', title: 'latest' }, clientUpdatedAt: '2026-01-01T00:00:02.000Z' }),
      ])
      const entries = await queue.getQueue()
      expect(entries).to.have.length(5)
      expect(entries.find(entry => entry.id === 'pending')).to.deep.equal(item('pending'))
      expect(entries.find(entry => entry.id === 'failed')).to.deep.equal(item('failed', 'failed'))
      expect(entries.map(entry => entry.noteId)).to.include.members(['delete-1', 'delete-2', 'concurrent'])
    })
  })

  it('rolls back the whole batch if adding one deletion fails', () => {
    const queue = new OfflineQueueService(webOfflineStorageAdapter)
    cy.then(async () => {
      await webOfflineStorageAdapter.upsertQueueItem(item('existing'))
      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function(value, ...rest) {
        if (value?.noteId === 'delete-2') throw new Error('simulated write failure')
        return original.call(this, value, ...rest)
      }
      try {
        let failed = false
        try { await queue.enqueueMany(deletes) } catch { failed = true }
        expect(failed).to.equal(true)
        expect(await queue.getQueue()).to.deep.equal([item('existing')])
      } finally {
        IDBObjectStore.prototype.put = original
      }
    })
  })
})
