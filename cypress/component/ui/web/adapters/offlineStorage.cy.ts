import { OfflineCacheService } from '@core/services/offlineCache'
import type { CachedNote } from '@core/types/offline'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

describe('Restore reconciliation in IndexedDB', { retries: 0 }, () => {
  const cache = new OfflineCacheService(webOfflineStorageAdapter)
  const expected: CachedNote = {
    id: 'restorable',
    user_id: 'owner-1',
    title: 'Current title',
    description: 'Current body',
    content: 'Legacy body',
    tags: ['current'],
    updatedAt: '2026-11-05T10:00:00Z',
    status: 'synced',
  }
  const restored = {
    title: 'Restored title',
    description: '',
    tags: ['restored'],
    updatedAt: '2026-11-05T11:00:00Z',
  }

  beforeEach(() => cy.then(() => webOfflineStorageAdapter.clearAll()))
  afterEach(() => cy.then(() => webOfflineStorageAdapter.clearAll()))

  it('updates the synced snapshot once and leaves the tag patch limited to tags', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(expected))
    cy.then(() => Promise.all([
      cache.patchSyncedNote(expected, restored),
      cache.patchSyncedNote(expected, restored),
    ])).should('have.members', [true, false])
    cy.then(() => cache.patchSyncedNote(expected, restored)).should('equal', false)
    cy.then(async () => {
      const [note] = await cache.loadNotes()
      expect(note).to.deep.include({ ...restored, id: expected.id, user_id: expected.user_id, status: 'synced' })
      expect(note.content).to.be.undefined
      expect(await cache.patchSyncedTags([{ expected: note, tags: ['renamed'] }])).to.deep.equal([note.id])
      expect(await cache.loadNotes()).to.deep.equal([{ ...note, tags: ['renamed'] }])
    })
  })

  it('preserves queued, pending, failed, changed, and unowned local snapshots', () => {
    const queued = { ...expected, id: 'queued' }
    const pending: CachedNote = { ...expected, id: 'pending', status: 'pending' }
    const failed: CachedNote = { ...expected, id: 'failed', status: 'failed' }
    const stale = { ...expected, id: 'changed' }
    const changed = { ...stale, description: 'New local content at the same revision' }
    const differentOwner = { ...expected, id: 'different-owner', user_id: 'owner-2' }
    const ownerless = { ...expected, id: 'ownerless', user_id: undefined }
    const operation = {
      id: 'queued-update',
      noteId: queued.id,
      operation: 'update' as const,
      payload: { description: 'Queued edit' },
      clientUpdatedAt: expected.updatedAt,
      status: 'pending' as const,
    }
    const snapshots = [changed, differentOwner, failed, ownerless, pending, queued]

    cy.then(() => webOfflineStorageAdapter.saveNotes(snapshots))
    cy.then(() => webOfflineStorageAdapter.upsertQueueItem(operation))
    cy.then(() => cache.patchSyncedNote(queued, restored)).should('equal', false)
    cy.then(() => cache.patchSyncedNote(pending, restored)).should('equal', false)
    cy.then(() => cache.patchSyncedNote(failed, restored)).should('equal', false)
    cy.then(() => cache.patchSyncedNote(stale, restored)).should('equal', false)
    cy.then(() => cache.patchSyncedNote({ ...differentOwner, user_id: expected.user_id }, restored)).should('equal', false)
    cy.then(() => cache.patchSyncedNote(ownerless, restored)).should('equal', false)
    cy.then(() => cache.loadNotes()).should('deep.equal', snapshots)
    cy.then(() => webOfflineStorageAdapter.getQueue()).should('deep.equal', [operation])
  })
})
