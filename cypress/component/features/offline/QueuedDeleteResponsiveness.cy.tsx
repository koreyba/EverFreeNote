import React, { useMemo, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import type { MutationQueueItem } from '@core/types/offline'
import type { NoteViewModel } from '@core/types/domain'
import { useNoteSync } from '@ui/web/hooks/useNoteSync'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { useNoteBulkActions } from '@ui/web/hooks/useNoteBulkActions'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import { webOfflineStorageAdapter as storage } from '@ui/web/adapters/offlineStorage'

const note = (id: string): NoteViewModel => ({
  id, user_id: 'owner', title: id, description: '', tags: [],
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
})
const queued = (id: string): MutationQueueItem => ({
  id: `queued-${id}`, noteId: id, operation: 'update', payload: { user_id: 'owner', title: id },
  status: 'failed', clientUpdatedAt: '2026-01-01T00:00:00.000Z',
})

type HarnessProps = {
  create?: (args: { id: string }) => Promise<void>
  update: (args: { id: string }) => Promise<void>
  remove: (args: { id: string }) => Promise<void>
  ids: string[]
}

function Harness({ create, update, remove, ids }: HarnessProps) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useMemo(() => new QueryClient(), [])
  const sync = useNoteSync({
    user: { id: 'owner' } as never,
    createNoteMutation: { mutateAsync: create ?? (async () => {}) },
    updateNoteMutation: { mutateAsync: update },
    deleteNoteMutation: { mutateAsync: remove },
  })
  const actions = useNoteBulkActions({
    userId: 'owner', selectedNoteIds: new Set(ids), isOffline: sync.isOffline,
    enqueueBatchAndDrainIfOnline: sync.enqueueBatchAndDrainIfOnline,
    offlineQueueRef: sync.offlineQueueRef, offlineCache: sync.offlineCache,
    setOfflineOverlay: sync.setOfflineOverlay, setPendingCount: sync.setPendingCount,
    deleteNoteMutation: { mutateAsync: remove } as never,
    exitSelectionMode: () => {}, setBulkDeleting: () => {}, onNotesDeleted: () => setDone(true),
    queryClient, notes: ids.map(note), selectAllVisibleCallback: () => {},
  })
  return <>
    <button data-cy="delete" onClick={() => void actions.deleteNotesByIds(ids).catch((e: Error) => setError(e.message))}>Delete</button>
    <output data-cy="done">{done ? 'done' : 'waiting'}</output>
    <output data-cy="error">{error}</output>
    <output data-cy="pending">{sync.pendingCount}</output>
    <output data-cy="failed">{sync.failedCount}</output>
    <output data-cy="overlay">{sync.offlineOverlay.filter(n => n.deleted).map(n => `${n.id}:${n.status}`).join(',')}</output>
  </>
}

function SingleHarness({ update, remove }: Omit<HarnessProps, 'ids'>) {
  const [done, setDone] = useState(false)
  const selected = note('target')
  const sync = useNoteSync({
    user: { id: 'owner' } as never,
    createNoteMutation: { mutateAsync: async () => {} },
    updateNoteMutation: { mutateAsync: update },
    deleteNoteMutation: { mutateAsync: remove },
  })
  const actions = useNoteSaveHandlers({
    user: { id: 'owner' }, isOffline: sync.isOffline, offlineCache: sync.offlineCache,
    enqueueMutation: sync.enqueueMutation, offlineQueueRef: sync.offlineQueueRef,
    setOfflineOverlay: sync.setOfflineOverlay, setPendingCount: sync.setPendingCount,
    setFailedCount: sync.setFailedCount, setLastSavedAt: sync.setLastSavedAt,
    createNoteMutation: { mutateAsync: async () => {} }, updateNoteMutation: { mutateAsync: update },
    deleteNoteMutation: { mutateAsync: remove }, removeTagMutation: { mutateAsync: async () => {} },
    selectedNote: selected, selectedNoteRef: { current: selected }, setSelectedNote: () => {},
    setIsEditing: () => {}, noteToDelete: selected, setDeleteDialogOpen: () => {},
    setNoteToDelete: () => {}, notes: [selected], notesRef: { current: [selected] },
  } as never)
  return <>
    <button data-cy="delete" onClick={() => void actions.confirmDeleteNote().then(setDone)}>Delete</button>
    <output data-cy="done">{done ? 'done' : 'waiting'}</output>
    <output data-cy="pending">{sync.pendingCount}</output>
    <output data-cy="overlay">{sync.offlineOverlay.filter(n => n.deleted).map(n => `${n.id}:${n.status}`).join(',')}</output>
  </>
}

describe('Queued deletion does not wait for an unrelated request', { retries: 0 }, () => {
  let release: () => void
  let started: boolean
  let idle: boolean
  let events: string[]

  beforeEach(() => {
    started = false
    idle = false
    events = []
    release = () => {}
    cy.then(async () => { await storage.clearAll() })
    const original = OfflineSyncManager.prototype.drainQueue
    cy.stub(OfflineSyncManager.prototype, 'drainQueue').callsFake(async function (this: OfflineSyncManager) {
      await original.call(this)
      idle = true
    })
  })

  afterEach(() => {
    cy.then(() => release())
  })

  it('persists and completes bulk deletion before a previous unrelated sync completes', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const update = async ({ id }: { id: string }) => {
      events.push(`update:${id}`)
      if (id === 'other') { started = true; await stalled }
    }
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<Harness update={update} remove={remove} ids={['target', 'second']} />)
    cy.wrap(null).should(() => expect(idle, 'initial empty drain finished').to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('other'), queued('target'), queued('second')]) })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.wrap(null).should(() => expect(started, 'other note request is in flight').to.equal(true))
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending').and('contain', 'second:pending')
    cy.then(async () => {
      const queue = await storage.getQueue()
      const cache = await storage.loadNotes()
      expect(queue.filter(item => item.operation === 'delete').map(item => item.noteId)).to.have.members(['target', 'second'])
      expect(queue.filter(item => item.operation === 'delete').every(item => item.payload.user_id === 'owner')).to.equal(true)
      expect(cache.filter(item => item.deleted).map(item => item.id)).to.have.members(['target', 'second'])
      expect(events).to.deep.equal(['update:other'])
    })
    cy.then(() => release())
    cy.wrap(null).should(() => expect(events).to.include.members(['delete:target', 'delete:second']))
  })


  it('completes while another drain is already active and later drains its delete', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const update = async ({ id }: { id: string }) => {
      events.push(`update:${id}`)
      if (id === 'other') { started = true; await stalled }
    }
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<Harness update={update} remove={remove} ids={['target']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('other'), queued('target')]) })
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.get('[data-cy="delete"]').trigger('click')
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.then(async () => {
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete')).to.equal(true)
      expect(events).to.deep.equal(['update:other'])
    })
    cy.then(() => release())
    cy.wrap(null).should(() => expect(events).to.include('delete:target'))
  })

  it('removes the pending indication after a fast successful sync', () => {
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<Harness update={async () => {}} remove={remove} ids={['target']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.wrap(null).should(() => expect(events).to.deep.equal(['delete:target']))
    cy.get('[data-cy="pending"]').should('have.text', '0')
    cy.get('[data-cy="overlay"]').should('not.contain', 'target:pending')
    cy.then(async () => { expect(await storage.getQueue()).to.have.length(0) })
  })

  it('reports a rejected background delete as failed and keeps the tombstone for retry', () => {
    let rejectDelete: (error: Error) => void = () => {}
    const response = new Promise<void>((_resolve, reject) => { rejectDelete = reject })
    let attempts = 0
    const remove = async () => {
      attempts += 1
      started = true
      if (attempts === 1) await response
    }
    cy.mount(<Harness update={async () => {}} remove={remove} ids={['target']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.then(() => rejectDelete(new Error('network unavailable')))
    cy.get('[data-cy="failed"]').should('have.text', '1')
    cy.get('[data-cy="pending"]').should('have.text', '0')
    cy.then(async () => {
      const queue = await storage.getQueue()
      expect(queue).to.have.length(1)
      expect(queue[0]).to.include({ noteId: 'target', operation: 'delete', status: 'failed' })
      expect(queue[0].payload.user_id).to.equal('owner')
      expect((await storage.loadNotes()).find(n => n.id === 'target')?.deleted).to.equal(true)
    })
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(attempts).to.equal(2))
    cy.get('[data-cy="failed"]').should('have.text', '0')
    cy.then(async () => { expect(await storage.getQueue()).to.have.length(0) })
  })

  it('does not claim deletion or save a tombstone when durable enqueue fails', () => {
    // Focusing the browser can retry a failed update. Keep it unsynced so that
    // a successful background request cannot consume the fixture before the check.
    const update = async () => { throw new Error('Synthetic update remains unsynced') }
    cy.mount(<><Harness update={update} remove={async () => { events.push('delete') }} ids={['target']} /><Toaster /></>)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.then(() => { cy.stub(storage, 'appendQueueItems').rejects(new Error('queue unavailable')) })
    cy.spy(toast, 'error').as('deleteError')
    cy.spy(toast, 'success').as('deleteSuccess')
    cy.get('[data-cy="delete"]').click()
    cy.get('[data-cy="error"]').should('have.text', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteError').should('have.been.calledOnceWithExactly', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteSuccess').should('not.have.been.called')
    cy.contains('[data-sonner-toast]', 'Some deletions may already be queued; check sync status.').should('be.visible')
    cy.get('[data-cy="done"]').should('have.text', 'waiting')
    cy.then(async () => {
      const queue = await storage.getQueue()
      expect(queue.map(item => item.id)).to.deep.equal(['queued-target'])
      expect(queue[0]).to.include({ noteId: 'target', operation: 'update' })
      expect(queue[0].payload).to.deep.equal({ user_id: 'owner', title: 'target' })
      expect((await storage.loadNotes()).some(item => item.deleted)).to.equal(false)
      expect(events).to.deep.equal([])
    })
  })


  it('finishes a single queued deletion while an unrelated sync is stalled', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const update = async ({ id }: { id: string }) => {
      events.push(`update:${id}`)
      if (id === 'other') { started = true; await stalled }
    }
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<SingleHarness update={update} remove={remove} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('other'), queued('target')]) })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.then(async () => {
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete')).to.equal(true)
      expect(events).to.deep.equal(['update:other'])
    })
    cy.then(() => release())
    cy.wrap(null).should(() => expect(events).to.include('delete:target'))
  })

  it('handles queued and direct deletes together without waiting for an unrelated sync', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const update = async ({ id }: { id: string }) => {
      events.push(`update:${id}`)
      if (id === 'other') { started = true; await stalled }
    }
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<Harness update={update} remove={remove} ids={['target', 'second', 'direct']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('other'), queued('target'), queued('second')]) })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.then(async () => {
      expect(events).to.have.members(['update:other', 'delete:direct'])
      const queue = await storage.getQueue()
      expect(queue.filter(item => item.operation === 'delete').map(item => item.noteId)).to.have.members(['target', 'second'])
    })
    cy.then(() => release())
    cy.wrap(null).should(() => expect(events).to.include.members(['delete:target', 'delete:second']))
  })

  it('keeps an enqueued delete when saving its tombstone fails while the queue is busy', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const update = async ({ id }: { id: string }) => {
      if (id === 'other') { started = true; await stalled }
    }
    cy.mount(<><Harness update={update} remove={async () => { events.push('delete') }} ids={['target']} /><Toaster /></>)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('other'), queued('target')]) })
    cy.then(() => { cy.stub(storage, 'saveNote').rejects(new Error('cache unavailable')) })
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.spy(toast, 'error').as('deleteError')
    cy.spy(toast, 'success').as('deleteSuccess')
    cy.get('[data-cy="delete"]').click()
    cy.get('[data-cy="error"]').should('have.text', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteError').should('have.been.calledOnceWithExactly', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteSuccess').should('not.have.been.called')
    cy.contains('[data-sonner-toast]', 'Some deletions may already be queued; check sync status.').should('be.visible')
    cy.get('[data-cy="done"]').should('have.text', 'waiting')
    cy.then(async () => {
      const queue = await storage.getQueue()
      expect(queue.some(item => item.noteId === 'target' && item.operation === 'delete' && item.payload.user_id === 'owner')).to.equal(true)
      expect((await storage.loadNotes()).some(item => item.id === 'target' && item.deleted)).to.equal(false)
      expect(events).to.deep.equal([])
    })
    cy.then(() => release())
  })


  it('does not restore a pending tombstone after sync wins the local-state race', () => {
    let releaseSnapshot: () => void = () => {}
    let tombstoneSaved = false
    let snapshotHeld = false
    let deleteRemoved = false
    const snapshot = new Promise<void>(resolve => { releaseSnapshot = resolve })
    release = () => releaseSnapshot()
    const remove = async () => { events.push('delete:target') }
    cy.mount(<Harness update={async () => {}} remove={remove} ids={['target']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.then(() => {
      const originalSave = storage.saveNote.bind(storage)
      const originalGetQueue = storage.getQueue.bind(storage)
      const originalRemove = storage.removeQueueItems.bind(storage)
      cy.stub(storage, 'saveNote').callsFake(async value => {
        await originalSave(value)
        tombstoneSaved = true
      })
      cy.stub(storage, 'getQueue').callsFake(async () => {
        const result = await originalGetQueue()
        if (tombstoneSaved && !snapshotHeld && result.some(item => item.noteId === 'target' && item.operation === 'delete')) {
          snapshotHeld = true
          await snapshot
        }
        return result
      })
      cy.stub(storage, 'removeQueueItems').callsFake(async ids => {
        await originalRemove(ids)
        if (events.includes('delete:target')) deleteRemoved = true
      })
    })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.wrap(null).should(() => expect(snapshotHeld).to.equal(true))
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(deleteRemoved).to.equal(true))
    // Give the sync callback time to compete with the deliberately held local read.
    cy.wait(200)
    cy.then(() => releaseSnapshot())
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('not.contain', 'target:pending')
    cy.get('[data-cy="pending"]').should('have.text', '0')
    cy.then(async () => { expect(await storage.getQueue()).to.have.length(0) })
  })


  it('leaves the durable deletion queued and releases the local lock when the tombstone write fails', () => {
    let saveStub: sinon.SinonStub
    cy.mount(<><Harness update={async () => {}} remove={async () => { events.push('delete') }} ids={['target']} /><Toaster /></>)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.then(() => { saveStub = cy.stub(storage, 'saveNote').rejects(new Error('cache unavailable')) })
    cy.spy(toast, 'error').as('deleteError')
    cy.spy(toast, 'success').as('deleteSuccess')
    // Start the focus-driven retry only after checking the failed local write.
    cy.get('[data-cy="delete"]').trigger('click')
    cy.get('[data-cy="error"]').should('have.text', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteError').should('have.been.calledOnceWithExactly', 'Could not complete local deletion. Some deletions may already be queued; check sync status.')
    cy.get('@deleteSuccess').should('not.have.been.called')
    cy.contains('[data-sonner-toast]', 'Some deletions may already be queued; check sync status.').should('be.visible')
    cy.get('[data-cy="done"]').should('have.text', 'waiting')
    cy.then(async () => {
      expect(events).to.deep.equal([])
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete' && item.payload.user_id === 'owner')).to.equal(true)
      saveStub.restore()
    })
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(events).to.deep.equal(['delete']))
  })


  it('does not restore a pending tombstone when a single delete syncs during local reconciliation', () => {
    let deletionStarted: () => void = () => {}
    let releaseDelete: () => void = () => {}
    let releaseSnapshot: () => void = () => {}
    let tombstoneSaved = false
    let snapshotHeld = false
    let deleteRemoved = false
    const startedDelete = new Promise<void>(resolve => { deletionStarted = resolve })
    const deleting = new Promise<void>(resolve => { releaseDelete = resolve })
    const snapshot = new Promise<void>(resolve => { releaseSnapshot = resolve })
    release = () => { releaseDelete(); releaseSnapshot() }
    const remove = async () => { deletionStarted(); await deleting }
    cy.mount(<SingleHarness update={async () => {}} remove={remove} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([queued('target')]) })
    cy.then(() => {
      const originalSave = storage.saveNote.bind(storage)
      const originalGetQueue = storage.getQueue.bind(storage)
      const originalRemove = storage.removeQueueItems.bind(storage)
      cy.stub(storage, 'removeQueueItems').callsFake(async ids => {
        await originalRemove(ids)
        deleteRemoved = true
      })
      cy.stub(storage, 'saveNote').callsFake(async value => {
        await startedDelete
        await originalSave(value)
        tombstoneSaved = true
      })
      cy.stub(storage, 'getQueue').callsFake(async () => {
        const result = await originalGetQueue()
        if (tombstoneSaved && !snapshotHeld && result.some(item => item.noteId === 'target' && item.operation === 'delete')) {
          snapshotHeld = true
          await snapshot
        }
        return result
      })
    })
    cy.get('[data-cy="delete"]').trigger('click')
    cy.then(async () => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if ((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete')) return
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      throw new Error('Timed out waiting for the queued deletion')
    })
    // The normal drain starts after the local callback. A focus event models
    // an independent drain that can still race the deliberately delayed save.
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(snapshotHeld).to.equal(true))
    cy.then(() => releaseDelete())
    cy.wrap(null).should(() => expect(deleteRemoved).to.equal(true))
    // Allow the sync callback to compete with the held local read.
    cy.wait(200)
    cy.then(() => releaseSnapshot())
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('not.contain', 'target:pending')
    cy.get('[data-cy="pending"]').should('have.text', '0')
  })


  it('keeps deletion behind an already-running create of the same note', () => {
    const stalled = new Promise<void>(resolve => { release = resolve })
    const create = async ({ id }: { id: string }) => {
      events.push(`create-start:${id}`)
      started = true
      await stalled
      events.push(`create-finish:${id}`)
    }
    const remove = async ({ id }: { id: string }) => { events.push(`delete:${id}`) }
    cy.mount(<Harness create={create} update={async () => {}} remove={remove} ids={['target']} />)
    cy.wrap(null).should(() => expect(idle).to.equal(true))
    cy.then(async () => { await storage.appendQueueItems!([{ ...queued('target'), operation: 'create' }]) })
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.get('[data-cy="delete"]').trigger('click')
    cy.get('[data-cy="done"]').should('have.text', 'done')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.then(async () => {
      expect(events).to.deep.equal(['create-start:target'])
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete')).to.equal(true)
    })
    cy.then(() => release())
    cy.wrap(null).should(() => expect(events).to.deep.equal(['create-start:target', 'create-finish:target', 'delete:target']))
  })
})
