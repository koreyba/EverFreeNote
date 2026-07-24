import type { MutationQueueItem } from '@core/types/offline'
import type { SupabaseClient } from '@supabase/supabase-js'

let capturedPerformSync: ((item: MutationQueueItem) => Promise<void>) | null = null

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  })),
}))

jest.mock('../../services/database', () => ({
  databaseService: {
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNoteById: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNoteById: jest.fn().mockResolvedValue(null),
  },
}))

const mockOfflineSyncManagerInstance = {
  enqueue: jest.fn(),
  drainQueue: jest.fn(),
}

jest.mock('@core/services/offlineSyncManager', () => ({
  OfflineSyncManager: jest.fn().mockImplementation(
    (_storage: unknown, performSync: (item: MutationQueueItem) => Promise<void>) => {
      capturedPerformSync = performSync
      return mockOfflineSyncManagerInstance
    }
  ),
}))

jest.mock('@core/utils/postgrest', () => ({
  isPostgrestNoRowsError: jest.fn((error: unknown) => {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'PGRST116'
  }),
}))

jest.mock('../../adapters/offlineStorage', () => ({
  mobileOfflineStorageAdapter: {},
}))

jest.mock('../../adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {},
}))

import { MobileSyncService, mobileSyncService } from '../../services/sync'
import { NoteService } from '@core/services/notes'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { databaseService } from '../../services/database'
import { mobileOfflineStorageAdapter } from '../../adapters/offlineStorage'
import { mobileNetworkStatusProvider } from '../../adapters/networkStatus'

describe('MobileSyncService', () => {
  let service: MobileSyncService
  const mockSupabase = {} as SupabaseClient
  let mockNoteServiceInstance: {
    createNote: jest.Mock
    updateNote: jest.Mock
    deleteNote: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    capturedPerformSync = null
    service = new MobileSyncService()
    ;(databaseService.saveNotes as jest.Mock).mockResolvedValue(undefined)
    ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValue(null)
  })

  describe('getManager', () => {
    it('throws error if service is not initialized', () => {
      expect(() => service.getManager()).toThrow('SyncService not initialized')
    })

    it('returns OfflineSyncManager instance after initialization', () => {
      service.init(mockSupabase)
      expect(service.getManager()).toBe(mockOfflineSyncManagerInstance)
    })
  })

  describe('init', () => {
    it('initializes OfflineSyncManager with adapters and NoteService', () => {
      service.init(mockSupabase)

      expect(NoteService).toHaveBeenCalledWith(mockSupabase)
      expect(OfflineSyncManager).toHaveBeenCalledTimes(1)
      expect(OfflineSyncManager).toHaveBeenCalledWith(
        mobileOfflineStorageAdapter,
        expect.any(Function),
        mobileNetworkStatusProvider
      )
    })

    it('initializes only once on multiple init calls', () => {
      service.init(mockSupabase)
      service.init(mockSupabase)

      expect(OfflineSyncManager).toHaveBeenCalledTimes(1)
    })
  })

  describe('performSync callback', () => {
    beforeEach(() => {
      service.init(mockSupabase)
      mockNoteServiceInstance = (NoteService as jest.Mock).mock.results[0].value
    })

    describe('create operation', () => {
      it('creates note via NoteService and saves it to local database', async () => {
        const createdNote = {
          id: 'note-1',
          title: 'Test Note',
          description: 'Description',
          tags: ['tag1'],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
        }
        mockNoteServiceInstance.createNote.mockResolvedValueOnce(createdNote)

        const item: MutationQueueItem = {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: {
            title: 'Test Note',
            description: 'Description',
            tags: ['tag1'],
            user_id: 'user-1',
          },
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.createNote).toHaveBeenCalledWith({
          id: 'note-1',
          title: 'Test Note',
          description: 'Description',
          tags: ['tag1'],
          userId: 'user-1',
        })
        expect(databaseService.saveNotes).toHaveBeenCalledWith([
          {
            ...createdNote,
            is_synced: 1,
            is_deleted: 0,
          },
        ])
      })

      it('uses fallback empty values when payload fields are missing', async () => {
        const createdNote = {
          id: 'note-2',
          title: '',
          description: '',
          tags: [],
          user_id: '',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
        }
        mockNoteServiceInstance.createNote.mockResolvedValueOnce(createdNote)

        const item: MutationQueueItem = {
          id: 'q-2',
          noteId: 'note-2',
          operation: 'create',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.createNote).toHaveBeenCalledWith({
          id: 'note-2',
          title: '',
          description: '',
          tags: [],
          userId: '',
        })
      })

      it('handles unique constraint violation error silently (idempotent create)', async () => {
        const uniqueViolationErr = Object.assign(new Error('Duplicate key'), { code: '23505' })
        mockNoteServiceInstance.createNote.mockRejectedValueOnce(uniqueViolationErr)

        const item: MutationQueueItem = {
          id: 'q-3',
          noteId: 'note-3',
          operation: 'create',
          payload: { title: 'Duplicate' },
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await expect(capturedPerformSync!(item)).resolves.toBeUndefined()
        expect(databaseService.saveNotes).not.toHaveBeenCalled()
      })

      it('rethrows non-unique constraint errors on create', async () => {
        const genericErr = new Error('Database error')
        mockNoteServiceInstance.createNote.mockRejectedValueOnce(genericErr)

        const item: MutationQueueItem = {
          id: 'q-4',
          noteId: 'note-4',
          operation: 'create',
          payload: { title: 'Error' },
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await expect(capturedPerformSync!(item)).rejects.toThrow('Database error')
      })
    })

    describe('update operation', () => {
      it('updates note via NoteService and saves updated note to database', async () => {
        ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValueOnce({
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Description',
          tags: ['local'],
          user_id: 'user-1',
        })
        const updatedNote = {
          id: 'note-1',
          title: 'New Title',
          description: 'New Body',
          tags: ['tag-new'],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:05:00Z',
        }
        mockNoteServiceInstance.updateNote.mockResolvedValueOnce(updatedNote)

        const item: MutationQueueItem = {
          id: 'q-5',
          noteId: 'note-1',
          operation: 'update',
          payload: {
            title: 'New Title',
            description: 'New Body',
            tags: ['tag-new'],
            user_id: 'user-1',
          },
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(databaseService.getLocalNoteById).toHaveBeenCalledWith('note-1')
        expect(mockNoteServiceInstance.updateNote).toHaveBeenCalledWith('note-1', {
          title: 'New Title',
          description: 'New Body',
          tags: ['tag-new'],
        })
        expect(databaseService.saveNotes).toHaveBeenCalledWith([
          {
            ...updatedNote,
            is_synced: 1,
            is_deleted: 0,
          },
        ])
      })

      it('uses localNote values as fallback when payload attributes are missing', async () => {
        ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValueOnce({
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Description',
          tags: ['local'],
          user_id: 'user-1',
        })
        mockNoteServiceInstance.updateNote.mockResolvedValueOnce({
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Description',
          tags: ['local'],
          user_id: 'user-1',
        })

        const item: MutationQueueItem = {
          id: 'q-6',
          noteId: 'note-1',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.updateNote).toHaveBeenCalledWith('note-1', {
          title: 'Local Title',
          description: 'Local Description',
          tags: ['local'],
        })
      })

      it('uses default fallbacks when payload and localNote are missing', async () => {
        ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValueOnce(null)
        mockNoteServiceInstance.updateNote.mockResolvedValueOnce({
          id: 'note-1',
          title: 'Untitled',
          description: '',
          tags: [],
          user_id: '',
        })

        const item: MutationQueueItem = {
          id: 'q-7',
          noteId: 'note-1',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.updateNote).toHaveBeenCalledWith('note-1', {
          title: 'Untitled',
          description: '',
          tags: [],
        })
      })

      it('falls back to createNote when updateNote fails with postgrest no rows error', async () => {
        ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValueOnce({
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Body',
          tags: ['tag1'],
          user_id: 'user-1',
        })
        const noRowsErr = Object.assign(new Error('No rows found'), { code: 'PGRST116' })
        mockNoteServiceInstance.updateNote.mockRejectedValueOnce(noRowsErr)

        const createdNote = {
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Body',
          tags: ['tag1'],
          user_id: 'user-1',
        }
        mockNoteServiceInstance.createNote.mockResolvedValueOnce(createdNote)

        const item: MutationQueueItem = {
          id: 'q-8',
          noteId: 'note-1',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.updateNote).toHaveBeenCalledWith('note-1', {
          title: 'Local Title',
          description: 'Local Body',
          tags: ['tag1'],
        })
        expect(mockNoteServiceInstance.createNote).toHaveBeenCalledWith({
          id: 'note-1',
          title: 'Local Title',
          description: 'Local Body',
          tags: ['tag1'],
          userId: 'user-1',
        })
        expect(databaseService.saveNotes).toHaveBeenCalledWith([
          {
            ...createdNote,
            is_synced: 1,
            is_deleted: 0,
          },
        ])
      })

      it('rethrows update error when error is NOT postgrest no rows error', async () => {
        ;(databaseService.getLocalNoteById as jest.Mock).mockResolvedValueOnce(null)
        const serverErr = new Error('Internal Server Error')
        mockNoteServiceInstance.updateNote.mockRejectedValueOnce(serverErr)

        const item: MutationQueueItem = {
          id: 'q-9',
          noteId: 'note-1',
          operation: 'update',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await expect(capturedPerformSync!(item)).rejects.toThrow('Internal Server Error')
        expect(mockNoteServiceInstance.createNote).not.toHaveBeenCalled()
      })
    })

    describe('delete operation', () => {
      it('deletes note via NoteService', async () => {
        mockNoteServiceInstance.deleteNote.mockResolvedValueOnce('note-1')

        const item: MutationQueueItem = {
          id: 'q-10',
          noteId: 'note-1',
          operation: 'delete',
          payload: {},
          clientUpdatedAt: '100',
          status: 'pending',
        }

        await capturedPerformSync!(item)

        expect(mockNoteServiceInstance.deleteNote).toHaveBeenCalledWith('note-1')
      })
    })
  })

  describe('exported mobileSyncService singleton', () => {
    it('is an instance of MobileSyncService', () => {
      expect(mobileSyncService).toBeInstanceOf(MobileSyncService)
    })
  })
})
