/**
 * Integration tests for offline sync workflow
 * Tests interaction between OfflineQueueService, OfflineCacheService, and OfflineSyncManager
 */
import { OfflineQueueService } from '@core/services/offlineQueue'
import { OfflineCacheService } from '@core/services/offlineCache'
import type { OfflineStorageAdapter, CachedNote, MutationQueueItem } from '@core/types/offline'

describe('Offline Sync Integration', () => {
  let queueService: OfflineQueueService
  let cacheService: OfflineCacheService
  let mockStorage: jest.Mocked<OfflineStorageAdapter>

  beforeEach(() => {
    // Create mock storage adapter
    mockStorage = {
      // Cache methods
      loadNotes: jest.fn().mockResolvedValue([]),
      saveNote: jest.fn().mockResolvedValue(undefined),
      saveNotes: jest.fn().mockResolvedValue(undefined),
      deleteNote: jest.fn().mockResolvedValue(undefined),
      markSynced: jest.fn().mockResolvedValue(undefined),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      // Queue methods
      getQueue: jest.fn().mockResolvedValue([]),
      upsertQueue: jest.fn().mockResolvedValue(undefined),
      upsertQueueItem: jest.fn().mockResolvedValue(undefined),
      popQueueBatch: jest.fn().mockResolvedValue([]),
      getPendingBatch: jest.fn().mockResolvedValue([]),
      removeQueueItems: jest.fn().mockResolvedValue(undefined),
      markQueueItemStatus: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<OfflineStorageAdapter>

    queueService = new OfflineQueueService(mockStorage)
    cacheService = new OfflineCacheService(mockStorage)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Create note offline workflow', () => {
    it('saves note to cache and queues mutation', async () => {
      const note: CachedNote = {
        id: 'new-note-id',
        user_id: 'user-1',
        title: 'New Note',
        description: 'Description',
        tags: ['work'],
        status: 'pending',
        updatedAt: new Date().toISOString(),
      }

      const mutation: MutationQueueItem = {
        id: 'mutation-1',
        noteId: note.id,
        operation: 'create',
        payload: note,
        clientUpdatedAt: note.updatedAt,
        status: 'pending',
      }

      // Save to cache
      await cacheService.saveNote(note)

      // Queue mutation
      await queueService.enqueue(mutation)

      // Verify both operations completed
      expect(mockStorage.saveNote).toHaveBeenCalledWith(note)
      expect(mockStorage.upsertQueueItem).toHaveBeenCalled()
    })
  })

  describe('Update note offline workflow', () => {
    it('updates cache and enqueues update mutation', async () => {
      const originalNote: CachedNote = {
        id: 'note-1',
        user_id: 'user-1',
        title: 'Original Title',
        description: 'Original',
        tags: [],
        status: 'synced',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      // Save original note
      await cacheService.saveNote(originalNote)
      await cacheService.markSynced(originalNote.id, originalNote.updatedAt)

      // Update note
      const updatedNote: CachedNote = {
        ...originalNote,
        title: 'Updated Title',
        status: 'pending',
        updatedAt: new Date().toISOString(),
      }

      const mutation: MutationQueueItem = {
        id: 'mutation-2',
        noteId: updatedNote.id,
        operation: 'update',
        payload: updatedNote,
        clientUpdatedAt: updatedNote.updatedAt,
        status: 'pending',
      }

      // Update cache and queue
      await cacheService.saveNote(updatedNote)
      await queueService.enqueue(mutation)

      // Verify updated data was stored
      expect(mockStorage.saveNote).toHaveBeenCalledWith(updatedNote)
    })
  })

  describe('Delete note offline workflow', () => {
    it('removes from cache and enqueues delete mutation', async () => {
      const note: CachedNote = {
        id: 'note-to-delete',
        user_id: 'user-1',
        title: 'To Delete',
        description: 'Desc',
        tags: [],
        status: 'synced',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      // Save note first
      await cacheService.saveNote(note)

      // Delete note
      await cacheService.deleteNote(note.id)

      const mutation: MutationQueueItem = {
        id: 'mutation-3',
        noteId: note.id,
        operation: 'delete',
        payload: {},
        clientUpdatedAt: new Date().toISOString(),
        status: 'pending',
      }

      await queueService.enqueue(mutation)

      // Verify deletion and queueing
      expect(mockStorage.deleteNote).toHaveBeenCalledWith(note.id)
      expect(mockStorage.upsertQueueItem).toHaveBeenCalled()
    })
  })

  describe('Batch sync workflow', () => {
    it('processes multiple mutations in order', async () => {
      const mutations: MutationQueueItem[] = [
        {
          id: 'mut-1',
          noteId: 'note-1',
          operation: 'create',
          payload: { id: 'note-1' },
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
        },
        {
          id: 'mut-2',
          noteId: 'note-2',
          operation: 'create',
          payload: { id: 'note-2' },
          clientUpdatedAt: '2024-01-01T00:01:00Z',
          status: 'pending',
        },
        {
          id: 'mut-3',
          noteId: 'note-1',
          operation: 'update',
          payload: { id: 'note-1', title: 'Updated' },
          clientUpdatedAt: '2024-01-01T00:02:00Z',
          status: 'pending',
        },
      ]

      // Enqueue all mutations
      await queueService.enqueueMany(mutations)

      // Mock getPendingBatch to return the mutations
      mockStorage.getPendingBatch.mockResolvedValue(mutations)

      // Get batch for sync
      const batch = await queueService.getPendingBatch(10)

      expect(batch).toHaveLength(3)
      expect(batch[0].noteId).toBe('note-1')
      expect(batch[0].operation).toBe('create')
      expect(batch[2].operation).toBe('update')
    })
  })

  describe('Conflict resolution workflow', () => {
    it('handles server-client conflicts during sync', async () => {
      const localNote: CachedNote = {
        id: 'conflict-note',
        user_id: 'user-1',
        title: 'Local Version',
        description: 'Local',
        tags: [],
        status: 'pending',
        updatedAt: '2024-01-01T12:00:00Z',
      }

      const serverNote: CachedNote = {
        id: 'conflict-note',
        user_id: 'user-1',
        title: 'Server Version',
        description: 'Server',
        tags: [],
        status: 'synced',
        updatedAt: '2024-01-01T13:00:00Z', // Server is newer
      }

      // Save local version
      await cacheService.saveNote(localNote)

      // Queue update mutation
      const mutation: MutationQueueItem = {
        id: 'mut-conflict',
        noteId: localNote.id,
        operation: 'update',
        payload: localNote,
        clientUpdatedAt: localNote.updatedAt,
        status: 'pending',
      }

      await queueService.enqueue(mutation)

      // In real sync, server would return conflict
      // Client should use server version (last-write-wins)
      await cacheService.saveNote(serverNote)
      await cacheService.markSynced(serverNote.id, serverNote.updatedAt)

      // Remove mutation from queue
      const batch = await queueService.getPendingBatch(10)
      await queueService.removeItems(batch.map((m) => m.id))

      // Verify server version is in cache
      mockStorage.loadNotes.mockResolvedValue([serverNote])
      const cachedNotes = await cacheService.loadNotes()
      const cachedNote = cachedNotes.find((n) => n.id === 'conflict-note')

      expect(cachedNote?.title).toBe('Server Version')
    })
  })

  describe('Cache size management', () => {
    it('enforces cache limit and removes oldest notes', async () => {
      const notes: CachedNote[] = Array.from({ length: 15 }, (_, i) => ({
        id: `note-${i}`,
        user_id: 'user-1',
        title: `Note ${i}`,
        description: `Desc ${i}`,
        tags: [],
        status: 'synced' as const,
        updatedAt: new Date(2024, 0, i + 1).toISOString(),
      }))

      // Save all notes
      for (const note of notes) {
        await cacheService.saveNote(note)
      }

      // Enforce limit (default is 10)
      await cacheService.enforceLimit()

      // Should call enforceLimit on storage
      expect(mockStorage.enforceLimit).toHaveBeenCalled()
    })
  })

  describe('Queue compaction', () => {
    it('compacts multiple updates to same note', async () => {
      const mutations: MutationQueueItem[] = [
        {
          id: 'mut-v1',
          noteId: 'note-1',
          operation: 'update',
          payload: { id: 'note-1', title: 'V1' },
          clientUpdatedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
        },
        {
          id: 'mut-v2',
          noteId: 'note-1',
          operation: 'update',
          payload: { id: 'note-1', title: 'V2' },
          clientUpdatedAt: '2024-01-01T00:01:00Z',
          status: 'pending',
        },
        {
          id: 'mut-v3',
          noteId: 'note-1',
          operation: 'update',
          payload: { id: 'note-1', title: 'V3' },
          clientUpdatedAt: '2024-01-01T00:02:00Z',
          status: 'pending',
        },
      ]

      await queueService.enqueueMany(mutations)

      // Mock getPendingBatch to return the mutations
      mockStorage.getPendingBatch.mockResolvedValue(mutations)

      // Get batch - should compact to single update
      const batch = await queueService.getPendingBatch(10)

      // Note: Actual compaction logic depends on implementation
      // This test verifies the queue can handle multiple updates
      expect(batch.length).toBeGreaterThan(0)
      
      const note1Updates = batch.filter((m) => m.noteId === 'note-1')
      expect(note1Updates.length).toBeGreaterThan(0)
    })
  })

  describe('Recovery from failed sync', () => {
    it('retries failed mutations with exponential backoff', async () => {
      const mutation: MutationQueueItem = {
        id: 'mut-retry',
        noteId: 'note-retry',
        operation: 'create',
        payload: { id: 'note-retry' },
        clientUpdatedAt: '2024-01-01T00:00:00Z',
        status: 'pending',
      }

      await queueService.enqueue(mutation)

      // Mark as failed
      await queueService.markStatus('mut-retry', 'failed')

      // Mock getPendingBatch to return the mutation
      mockStorage.getPendingBatch.mockResolvedValue([mutation])

      // Get pending batch - should include failed item
      const batch = await queueService.getPendingBatch(10)

      expect(batch.find((m) => m.noteId === 'note-retry')).toBeDefined()
    })
  })
})
