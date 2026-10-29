import { OfflineQueueService } from '../../../../core/services/offlineQueue'
import type { OfflineStorageAdapter, MutationQueueItem } from '../../../../core/types/offline'

describe('OfflineQueueService', () => {
  let service: OfflineQueueService
  let mockStorage: OfflineStorageAdapter

  beforeEach(() => {
    mockStorage = {
      loadNotes: cy.stub().resolves([]),
      saveNote: cy.stub().resolves(),
      saveNotes: cy.stub().resolves(),
      deleteNote: cy.stub().resolves(),
      getQueue: cy.stub().resolves([]),
      upsertQueueItem: cy.stub().resolves(),
      upsertQueue: cy.stub().resolves(),
      popQueueBatch: cy.stub().resolves([]),
      getPendingBatch: cy.stub().resolves([]),
      removeQueueItems: cy.stub().resolves(),
      markSynced: cy.stub().resolves(),
      markQueueItemStatus: cy.stub().resolves(),
      enforceLimit: cy.stub().resolves(),
      clearAll: cy.stub().resolves(),
    }
    service = new OfflineQueueService(mockStorage)
  })

  it('should enqueue a single item', async () => {
    const input = {
      noteId: 'note-1',
      operation: 'create' as const,
      payload: { title: 'Test' },
      clientUpdatedAt: new Date().toISOString(),
    }

    await service.enqueue(input)

    expect(mockStorage.upsertQueueItem).to.have.been.calledOnce
    const callArgs = (mockStorage.upsertQueueItem as unknown as sinon.SinonStub).firstCall.args[0]
    expect(callArgs).to.include({
      noteId: input.noteId,
      operation: input.operation,
      status: 'pending',
      attempts: 0,
    })
    expect(callArgs.id).to.be.a('string')
  })

  it('should enqueue multiple items', async () => {
    const inputs = [
      {
        noteId: 'note-1',
        operation: 'create' as const,
        payload: {},
        clientUpdatedAt: new Date().toISOString(),
      },
      {
        noteId: 'note-2',
        operation: 'update' as const,
        payload: {},
        clientUpdatedAt: new Date().toISOString(),
      },
    ]

    const existing: MutationQueueItem = {
      id: 'existing', noteId: 'another-note', operation: 'update',
      payload: { user_id: 'owner-a', title: 'keep me' },
      clientUpdatedAt: '2023-01-01T09:00:00Z', status: 'failed',
    }
    const stored = [existing]
    mockStorage.appendQueueItems = cy.stub().callsFake(async (entries: MutationQueueItem[]) => {
      stored.push(...entries)
    })

    await service.enqueueMany(inputs)

    expect(mockStorage.appendQueueItems).to.have.been.calledOnce
    expect(mockStorage.upsertQueue).not.to.have.been.called
    expect(stored).to.have.length(3)
    expect(stored[0]).to.deep.equal(existing)
    expect(stored.slice(1).map(item => item.noteId)).to.deep.equal(['note-1', 'note-2'])
    expect(stored.slice(1).map(item => item.status)).to.deep.equal(['pending', 'pending'])
  })

  it('uses individual upserts without replacing the queue on older adapters', async () => {
    const input = [
      { noteId: 'note-1', operation: 'delete' as const, payload: { user_id: 'owner-a' }, clientUpdatedAt: '2023-01-01T10:00:00Z' },
      { noteId: 'note-2', operation: 'delete' as const, payload: { user_id: 'owner-a' }, clientUpdatedAt: '2023-01-01T10:01:00Z' },
    ]
    await service.enqueueMany(input)
    expect(mockStorage.upsertQueue).not.to.have.been.called
    expect(mockStorage.upsertQueueItem).to.have.been.calledTwice
    const calls = (mockStorage.upsertQueueItem as unknown as sinon.SinonStub).getCalls()
    expect(calls.map(call => call.args[0].noteId)).to.deep.equal(['note-1', 'note-2'])
    expect(calls.map(call => call.args[0].payload.user_id)).to.deep.equal(['owner-a', 'owner-a'])
  })

  it('should get queue', async () => {
    const mockQueue = [{ id: '1' }] as MutationQueueItem[]
    ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves(mockQueue)

    const result = await service.getQueue()
    expect(result).to.equal(mockQueue)
    expect(mockStorage.getQueue).to.have.been.calledOnce
  })

  it('should upsert queue (replace)', async () => {
    const items = [{ id: '1' }] as MutationQueueItem[]
    await service.upsertQueue(items)
    expect(mockStorage.upsertQueue).to.have.been.calledWith(items)
  })

  it('should get pending batch', async () => {
    const mockBatch = [{ id: '1' }] as MutationQueueItem[]
    ;(mockStorage.getPendingBatch as unknown as sinon.SinonStub).resolves(mockBatch)

    const result = await service.getPendingBatch(5)
    expect(result).to.equal(mockBatch)
    expect(mockStorage.getPendingBatch).to.have.been.calledWith(5)
  })

  it('should remove items', async () => {
    const ids = ['1', '2']
    await service.removeItems(ids)
    expect(mockStorage.removeQueueItems).to.have.been.calledWith(ids)
  })

  it('should mark status', async () => {
    await service.markStatus('1', 'failed', 'error msg')
    expect(mockStorage.markQueueItemStatus).to.have.been.calledWith('1', 'failed', 'error msg')
  })
})
