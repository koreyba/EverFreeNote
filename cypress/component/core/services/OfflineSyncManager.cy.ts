import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import type { OfflineStorageAdapter, NetworkStatusProvider, MutationQueueItem } from '@core/types/offline'

describe('OfflineSyncManager', () => {
  let manager: OfflineSyncManager
  let mockStorage: OfflineStorageAdapter
  let mockNetwork: NetworkStatusProvider
  let performSyncStub: sinon.SinonStub
  let onSuccessStub: sinon.SinonStub

  const createItem = (id: string, noteId: string, operation: MutationQueueItem['operation'] = 'update'): MutationQueueItem => ({
    id,
    noteId,
    operation,
    payload: {},
    clientUpdatedAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  })

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

    mockNetwork = {
      isOnline: cy.stub().returns(false),
      subscribe: cy.stub().returns(() => {}),
    }

    performSyncStub = cy.stub().resolves()
    onSuccessStub = cy.stub().resolves()

    manager = new OfflineSyncManager(
      mockStorage,
      performSyncStub,
      mockNetwork,
      onSuccessStub
    )
  })

  afterEach(() => {
    manager.dispose()
  })

  it('should initialize with correct online state', () => {
    expect(mockNetwork.isOnline).to.have.been.called
    expect((manager as unknown as { online: boolean }).online).to.be.false
  })

  it('should subscribe to network status changes', () => {
    expect(mockNetwork.subscribe).to.have.been.called
  })

  it('should drain queue on initialization if already online', () => {
    // Create a new manager instance to test initialization logic
    const localStorage = { ...mockStorage }
    const localNetwork = { ...mockNetwork, isOnline: cy.stub().returns(true) }
    
    // Setup queue to have items so drainQueue actually does something visible
    ;(localStorage.getQueue as unknown as sinon.SinonStub).resolves([createItem('1', 'note-1')])
    
    const localManager = new OfflineSyncManager(
      localStorage,
      performSyncStub,
      localNetwork,
      onSuccessStub
    )
    
    // drainQueue is async and not awaited in constructor, so we need to wait a bit or check if it started
    // Since it calls getQueue immediately, we can check that.
    cy.wrap(localStorage.getQueue).should('have.been.called')
    
    localManager.dispose()
  })

  it('should drain queue when coming online', async () => {
    const drainSpy = cy.spy(manager, 'drainQueue')
    
    // Simulate network callback
    const callback = (mockNetwork.subscribe as unknown as sinon.SinonStub).firstCall.args[0]
    callback(true)

    expect(drainSpy).to.have.been.called
  })

  describe('drainQueue', () => {
    beforeEach(() => {
      // Ensure manager is online for drain tests
      (manager as unknown as { online: boolean }).online = true
    })

    it('should not drain if offline', async () => {
      manager.handleOffline()
      await manager.drainQueue()
      expect(mockStorage.getQueue).to.not.have.been.called
    })

    it('should compact queue before processing', async () => {
      // Setup queue with compactable items
      const items = [
        createItem('1', 'note-1', 'create'),
        createItem('2', 'note-1', 'update'),
      ]
      ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves(items)
      ;(mockStorage.getPendingBatch as unknown as sinon.SinonStub).resolves([]) // Stop loop immediately

      await manager.drainQueue()

      // Should have called upsertQueue with compacted items (1 item)
      expect(mockStorage.upsertQueue).to.have.been.called
      const upsertArgs = (mockStorage.upsertQueue as unknown as sinon.SinonStub).firstCall.args[0]
      expect(upsertArgs).to.have.length(1)
      expect(upsertArgs[0].operation).to.equal('create')
    })

    it('should process pending batch and remove successful items', async () => {
      const item = createItem('1', 'note-1')
      ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item])
      
      // First call returns item, second call returns empty to stop loop
      const getPendingBatch = mockStorage.getPendingBatch as unknown as sinon.SinonStub
      getPendingBatch.onFirstCall().resolves([item])
      getPendingBatch.onSecondCall().resolves([])

      await manager.drainQueue()

      expect(performSyncStub).to.have.been.calledWith(item)
      expect(mockStorage.removeQueueItems).to.have.been.calledWith([item.id])
      expect(onSuccessStub).to.have.been.calledWith(item)
    })

    it('should handle sync failure', async () => {
      const item = createItem('1', 'note-1')
      ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item])
      
      const getPendingBatch = mockStorage.getPendingBatch as unknown as sinon.SinonStub
      getPendingBatch.onFirstCall().resolves([item])
      getPendingBatch.onSecondCall().resolves([])

      performSyncStub.rejects(new Error('Sync failed'))

      await manager.drainQueue()

      expect(mockStorage.removeQueueItems).to.not.have.been.called
      expect(mockStorage.markQueueItemStatus).to.have.been.calledWith(item.id, 'failed', 'Sync failed')
    })

    it('should stop draining if network goes offline during process', async () => {
      const item1 = createItem('1', 'note-1')
      const item2 = createItem('2', 'note-2')
      
      ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item1, item2])
      
      const getPendingBatch = mockStorage.getPendingBatch as unknown as sinon.SinonStub
      getPendingBatch.resolves([item1]) // Always return something to keep loop going if not checked

      // Mock performSync to go offline
      performSyncStub.callsFake(async () => {
        manager.handleOffline()
      })

      await manager.drainQueue()

      // Should only process once because it went offline
      expect(performSyncStub).to.have.been.calledOnce
    })
  })

  describe('enqueue', () => {
    it('should enqueue item and trigger drain if online', async () => {
      (manager as unknown as { online: boolean }).online = true
      const drainSpy = cy.spy(manager, 'drainQueue')
      const input = { noteId: '1', operation: 'create' as const, payload: {}, clientUpdatedAt: '' }
      
      await manager.enqueue(input)

      expect(mockStorage.upsertQueueItem).to.have.been.called
      expect(drainSpy).to.have.been.called
    })

    it('should enqueue item but NOT trigger drain if offline', async () => {
      manager.handleOffline()
      const drainSpy = cy.spy(manager, 'drainQueue')
      const input = { noteId: '1', operation: 'create' as const, payload: {}, clientUpdatedAt: '' }
      
      await manager.enqueue(input)

      expect(mockStorage.upsertQueueItem).to.have.been.called
      expect(drainSpy).to.not.have.been.called
    })
  })

  it('should prevent parallel drain calls', async () => {
    (manager as unknown as { online: boolean }).online = true
    const item = createItem('1', 'note-1')
    ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item])
    
    const getPendingBatch = mockStorage.getPendingBatch as unknown as sinon.SinonStub
    getPendingBatch.onFirstCall().resolves([item])
    getPendingBatch.resolves([]) // Subsequent calls return empty to stop loop

    let resolveSync: (() => void) | undefined
    const syncPromise = new Promise<void>(resolve => { resolveSync = resolve })
    performSyncStub.returns(syncPromise)

    // Call drainQueue twice
    const p1 = manager.drainQueue()
    const p2 = manager.drainQueue()

    // p2 should return immediately because draining is true
    await p2
    
    // p1 is waiting for performSync
    // Resolve it now
    if (resolveSync) resolveSync()
    
    await p1

    // Should only start one drain process (one call to getQueue/compact)
    expect(mockStorage.getQueue).to.have.been.calledOnce
  })

  it('should use provided batchSize', async () => {
    (manager as unknown as { online: boolean }).online = true
    const item = createItem('1', 'note-1')
    ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item])
    ;(mockStorage.getPendingBatch as unknown as sinon.SinonStub).resolves([])

    await manager.drainQueue({ batchSize: 50 })

    expect(mockStorage.getPendingBatch).to.have.been.calledWith(50)
  })

  it('should use custom onSuccess callback', async () => {
    (manager as unknown as { online: boolean }).online = true
    const item = createItem('1', 'note-1')
    ;(mockStorage.getQueue as unknown as sinon.SinonStub).resolves([item])
    
    const getPendingBatch = mockStorage.getPendingBatch as unknown as sinon.SinonStub
    getPendingBatch.onFirstCall().resolves([item])
    getPendingBatch.onSecondCall().resolves([])

    const customOnSuccess = cy.stub().resolves()
    
    await manager.drainQueue({ onSuccess: customOnSuccess })
    
    expect(customOnSuccess).to.have.been.calledWith(item)
    expect(onSuccessStub).to.not.have.been.called // Default should not be called
  })

  it('should unsubscribe from network status on dispose', () => {
    const unsubscribeSpy = cy.spy()
    ;(mockNetwork.subscribe as unknown as sinon.SinonStub).returns(unsubscribeSpy)
    
    // Re-create manager to capture the spy
    manager = new OfflineSyncManager(
      mockStorage,
      performSyncStub,
      mockNetwork
    )
    
    manager.dispose()
    expect(unsubscribeSpy).to.have.been.called
  })
})
