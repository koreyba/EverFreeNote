import { OfflineCacheService } from '@core/services/offlineCache'
import type { OfflineStorageAdapter, CachedNote } from '@core/types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '@core/constants/offline'

describe('core/services/offlineCache', () => {
  let service: OfflineCacheService
  let mockStorage: jest.Mocked<OfflineStorageAdapter>

  beforeEach(() => {
    mockStorage = {
      loadNotes: jest.fn(),
      saveNote: jest.fn(),
      saveNotes: jest.fn(),
      deleteNote: jest.fn(),
      markSynced: jest.fn(),
      enforceLimit: jest.fn(),
      getQueue: jest.fn(),
      upsertQueueItem: jest.fn(),
      upsertQueue: jest.fn(),
      popQueueBatch: jest.fn(),
      getPendingBatch: jest.fn(),
      removeQueueItems: jest.fn(),
      markQueueItemStatus: jest.fn(),
      clearAll: jest.fn(),
    }

    service = new OfflineCacheService(mockStorage)
  })

  describe('loadNotes', () => {
    it('loads notes without pagination', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-1',
          status: 'synced',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      mockStorage.loadNotes.mockResolvedValue(notes)

      const result = await service.loadNotes()

      expect(result).toEqual(notes)
      expect(mockStorage.loadNotes).toHaveBeenCalledWith({})
    })

    it('loads notes with limit', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-1',
          status: 'synced',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      mockStorage.loadNotes.mockResolvedValue(notes)

      const result = await service.loadNotes(10)

      expect(result).toEqual(notes)
      expect(mockStorage.loadNotes).toHaveBeenCalledWith({ limit: 10 })
    })

    it('loads notes with limit and offset', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-2',
          status: 'synced',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ]
      mockStorage.loadNotes.mockResolvedValue(notes)

      const result = await service.loadNotes(10, 5)

      expect(result).toEqual(notes)
      expect(mockStorage.loadNotes).toHaveBeenCalledWith({ limit: 10, offset: 5 })
    })

    it('returns empty array when storage returns empty', async () => {
      mockStorage.loadNotes.mockResolvedValue([])

      const result = await service.loadNotes()

      expect(result).toEqual([])
    })

    it('propagates storage errors', async () => {
      const error = new Error('Storage error')
      mockStorage.loadNotes.mockRejectedValue(error)

      await expect(service.loadNotes()).rejects.toThrow('Storage error')
    })
  })

  describe('saveNote', () => {
    it('saves a note', async () => {
      const note: CachedNote = {
        id: 'note-1',
        status: 'synced',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      mockStorage.saveNote.mockResolvedValue()
      mockStorage.enforceLimit.mockResolvedValue()

      await service.saveNote(note)

      expect(mockStorage.saveNote).toHaveBeenCalledWith(note)
      expect(mockStorage.enforceLimit).toHaveBeenCalled()
    })

    it('enforces limit after saving', async () => {
      const note: CachedNote = {
        id: 'note-1',
        status: 'pending',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      mockStorage.saveNote.mockResolvedValue()
      mockStorage.enforceLimit.mockResolvedValue()

      await service.saveNote(note)

      expect(mockStorage.saveNote).toHaveBeenCalledWith(note)
      expect(mockStorage.enforceLimit).toHaveBeenCalledTimes(1)
    })

    it('propagates save errors', async () => {
      const note: CachedNote = {
        id: 'note-1',
        status: 'synced',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const error = new Error('Save failed')
      mockStorage.saveNote.mockRejectedValue(error)

      await expect(service.saveNote(note)).rejects.toThrow('Save failed')
      expect(mockStorage.enforceLimit).not.toHaveBeenCalled()
    })
  })

  describe('saveNotes', () => {
    it('saves multiple notes', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-1',
          status: 'synced',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'note-2',
          status: 'pending',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ]
      mockStorage.saveNotes.mockResolvedValue()
      mockStorage.enforceLimit.mockResolvedValue()

      await service.saveNotes(notes)

      expect(mockStorage.saveNotes).toHaveBeenCalledWith(notes)
      expect(mockStorage.enforceLimit).toHaveBeenCalled()
    })

    it('saves empty array', async () => {
      mockStorage.saveNotes.mockResolvedValue()
      mockStorage.enforceLimit.mockResolvedValue()

      await service.saveNotes([])

      expect(mockStorage.saveNotes).toHaveBeenCalledWith([])
      expect(mockStorage.enforceLimit).toHaveBeenCalled()
    })

    it('enforces limit after saving multiple notes', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-1',
          status: 'synced',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      mockStorage.saveNotes.mockResolvedValue()
      mockStorage.enforceLimit.mockResolvedValue()

      await service.saveNotes(notes)

      expect(mockStorage.enforceLimit).toHaveBeenCalledTimes(1)
    })

    it('propagates save errors', async () => {
      const notes: CachedNote[] = [
        {
          id: 'note-1',
          status: 'synced',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      const error = new Error('Batch save failed')
      mockStorage.saveNotes.mockRejectedValue(error)

      await expect(service.saveNotes(notes)).rejects.toThrow('Batch save failed')
      expect(mockStorage.enforceLimit).not.toHaveBeenCalled()
    })
  })

  describe('deleteNote', () => {
    it('deletes a note', async () => {
      mockStorage.deleteNote.mockResolvedValue()

      await service.deleteNote('note-1')

      expect(mockStorage.deleteNote).toHaveBeenCalledWith('note-1')
    })

    it('propagates delete errors', async () => {
      const error = new Error('Delete failed')
      mockStorage.deleteNote.mockRejectedValue(error)

      await expect(service.deleteNote('note-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('markSynced', () => {
    it('marks note as synced with updatedAt', async () => {
      mockStorage.markSynced.mockResolvedValue()

      await service.markSynced('note-1', '2024-01-01T12:00:00Z')

      expect(mockStorage.markSynced).toHaveBeenCalledWith('note-1', '2024-01-01T12:00:00Z')
    })

    it('propagates mark synced errors', async () => {
      const error = new Error('Mark synced failed')
      mockStorage.markSynced.mockRejectedValue(error)

      await expect(service.markSynced('note-1', '2024-01-01T12:00:00Z')).rejects.toThrow(
        'Mark synced failed'
      )
    })
  })

  describe('enforceLimit', () => {
    it('calls storage enforceLimit', async () => {
      mockStorage.enforceLimit.mockResolvedValue()

      await service.enforceLimit()

      expect(mockStorage.enforceLimit).toHaveBeenCalled()
    })

    it('propagates enforce limit errors', async () => {
      const error = new Error('Enforce limit failed')
      mockStorage.enforceLimit.mockRejectedValue(error)

      await expect(service.enforceLimit()).rejects.toThrow('Enforce limit failed')
    })
  })

  describe('getCacheLimitBytes', () => {
    it('returns the cache limit constant', () => {
      const limit = service.getCacheLimitBytes()

      expect(limit).toBe(OFFLINE_CACHE_LIMIT_BYTES)
    })

    it('returns a positive number', () => {
      const limit = service.getCacheLimitBytes()

      expect(limit).toBeGreaterThan(0)
    })
  })
})
