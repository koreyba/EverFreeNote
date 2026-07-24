import type { MutationQueueItem } from '@core/types/offline'

const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
}

const mockOpenDatabaseAsync = jest.fn().mockImplementation(() => Promise.resolve(mockDb))

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}))

import { DatabaseService, databaseService } from '../../services/database'

describe('DatabaseService', () => {
  let service: DatabaseService

  beforeEach(() => {
    jest.clearAllMocks()
    mockOpenDatabaseAsync.mockImplementation(() => Promise.resolve(mockDb))
    mockDb.execAsync.mockResolvedValue(undefined)
    mockDb.runAsync.mockResolvedValue(undefined)
    mockDb.getAllAsync.mockResolvedValue([])
    mockDb.getFirstAsync.mockResolvedValue(null)
    service = new DatabaseService()
  })

  describe('init', () => {
    it('initializes database and creates schema once', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      const db1 = await service.init()
      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('everfreenote.db')
      expect(mockDb.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS notes'))
      expect(db1).toBe(mockDb)

      const db2 = await service.init()
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1)
      expect(db2).toBe(mockDb)
    })

    it('backfills note tags during init if note_tags count is 0', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([
          { id: 'note-1', tags: '["work", "important"]' },
          { id: 'note-2', tags: null },
        ])

      await service.init()

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO note_tags (note_id, tag) VALUES (?, ?)',
        ['note-1', 'work']
      )
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO note_tags (note_id, tag) VALUES (?, ?)',
        ['note-1', 'important']
      )
    })
  })

  describe('saveNotes', () => {
    it('does nothing when notes array is empty', async () => {
      await service.saveNotes([])
      expect(mockDb.execAsync).not.toHaveBeenCalledWith('BEGIN')
    })

    it('saves valid notes in a transaction and normalizes tags', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 1 }])

      await service.saveNotes([
        {
          id: 'note-1',
          title: 'Title 1',
          description: 'Desc 1',
          tags: ['Work', 'work', '  Tech  '],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
          is_synced: 1,
          is_deleted: 0,
        },
      ])

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO notes'),
        ['note-1', 'Title 1', 'Desc 1', '["Work","work","  Tech  "]', 'user-1', '2026-07-24T12:00:00Z', '2026-07-24T12:00:00Z', 1, 0]
      )
      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM note_tags WHERE note_id = ?', ['note-1'])
      expect(mockDb.runAsync).toHaveBeenCalledWith('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', ['note-1', 'Work'])
      expect(mockDb.runAsync).toHaveBeenCalledWith('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', ['note-1', 'Tech'])
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT')
    })

    it('skips notes without user_id', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 1 }])

      await service.saveNotes([
        {
          id: 'note-no-user',
          title: 'No User',
          description: '',
          tags: [],
          user_id: '',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
        },
      ])

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.runAsync).not.toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO notes'), expect.anything())
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT')
    })

    it('rolls back transaction on error', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 1 }])
      mockDb.runAsync.mockRejectedValueOnce(new Error('DB failure'))

      await expect(
        service.saveNotes([
          {
            id: 'note-err',
            title: 'Error Note',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
          },
        ])
      ).rejects.toThrow('DB failure')

      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('getLocalNotes and getLocalNoteById', () => {
    it('getLocalNotes queries notes by userId and parses JSON tags', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'note-1',
            title: 'Note 1',
            description: 'Desc 1',
            tags: '["tag1", "tag2"]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
        ])

      const notes = await service.getLocalNotes('user-1')

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
        ['user-1']
      )
      expect(notes).toEqual([
        {
          id: 'note-1',
          title: 'Note 1',
          description: 'Desc 1',
          tags: ['tag1', 'tag2'],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
          is_synced: 1,
          is_deleted: 0,
        },
      ])
    })

    it('getLocalNoteById queries note by id and handles invalid tag JSON gracefully', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Note 1',
        description: 'Desc 1',
        tags: 'invalid-json',
        user_id: 'user-1',
        created_at: '2026-07-24T12:00:00Z',
        updated_at: '2026-07-24T12:00:00Z',
        is_synced: 1,
        is_deleted: 0,
      })

      const note = await service.getLocalNoteById('note-1')

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM notes WHERE id = ? LIMIT 1',
        ['note-1']
      )
      expect(note).toEqual(
        expect.objectContaining({
          id: 'note-1',
          tags: [],
        })
      )
    })

    it('getLocalNoteById returns null when note is not found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])
      mockDb.getFirstAsync.mockResolvedValueOnce(null)

      const note = await service.getLocalNoteById('missing-note')
      expect(note).toBeNull()
    })
  })

  describe('getLocalNotesByTag', () => {
    it('queries notes joined with note_tags and returns notes and total count', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'note-1',
            title: 'Tagged Note',
            description: 'Desc',
            tags: '["important"]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
        ])
        .mockResolvedValueOnce([{ count: 1 }])

      const result = await service.getLocalNotesByTag('user-1', 'important', { limit: 10, offset: 0 })

      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].tags).toEqual(['important'])
      expect(result.total).toBe(1)
    })
  })

  describe('markDeleted', () => {
    it('sets is_deleted = 1 and removes tags from note_tags', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      await service.markDeleted('note-1', 'user-1')

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE notes SET is_deleted = 1, is_synced = 0 WHERE id = ? AND user_id = ?',
        ['note-1', 'user-1']
      )
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM note_tags WHERE note_id = ?',
        ['note-1']
      )
    })
  })

  describe('mutation queue methods', () => {
    it('getQueue returns queue items with parsed JSON payloads', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'q-1',
            noteId: 'note-1',
            operation: 'create',
            payload: '{"title":"Test Note"}',
            clientUpdatedAt: '100',
            status: 'pending',
            attempts: 0,
            lastError: null,
          },
        ])

      const queue = await service.getQueue()

      expect(queue).toEqual([
        {
          id: 'q-1',
          noteId: 'note-1',
          operation: 'create',
          payload: { title: 'Test Note' },
          clientUpdatedAt: '100',
          status: 'pending',
          attempts: 0,
          lastError: null,
        },
      ])
    })

    it('upsertQueueItem inserts or replaces queue item', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      const item: MutationQueueItem = {
        id: 'q-1',
        noteId: 'note-1',
        operation: 'update',
        payload: { title: 'Updated Title' },
        clientUpdatedAt: '100',
        status: 'pending',
      }

      await service.upsertQueueItem(item)

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO mutation_queue'),
        ['q-1', 'note-1', 'update', '{"title":"Updated Title"}', '100', 'pending', 0, null]
      )
    })

    it('removeQueueItems removes queue items by id list', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      await service.removeQueueItems(['q-1', 'q-2'])

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM mutation_queue WHERE id IN (?,?)',
        ['q-1', 'q-2']
      )
    })

    it('removeQueueItems does nothing when id list is empty', async () => {
      await service.removeQueueItems([])

      expect(mockDb.runAsync).not.toHaveBeenCalledWith(expect.stringContaining('DELETE FROM mutation_queue'), expect.anything())
    })

    it('hasPendingWrites returns true when non-delete pending or failed operations exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])
      mockDb.getFirstAsync.mockResolvedValueOnce({ cnt: 2 })

      const hasPending = await service.hasPendingWrites('note-1')

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        "SELECT COUNT(*) as cnt FROM mutation_queue WHERE noteId = ? AND operation != 'delete' AND status IN ('pending', 'failed')",
        ['note-1']
      )
      expect(hasPending).toBe(true)
    })

    it('hasPendingWrites returns false when count is 0', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])
      mockDb.getFirstAsync.mockResolvedValueOnce({ cnt: 0 })

      const hasPending = await service.hasPendingWrites('note-1')
      expect(hasPending).toBe(false)
    })

    it('markQueueItemStatus updates status and lastError in database', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      await service.markQueueItemStatus('q-1', 'failed', 'Timeout error')

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE mutation_queue SET status = ?, lastError = ?, attempts = attempts + 1 WHERE id = ?',
        ['failed', 'Timeout error', 'q-1']
      )
    })
  })

  describe('searchNotes', () => {
    it('executes FTS5 search query and attaches snippet/rank', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'note-1',
            title: 'Evernote import',
            description: 'Body text',
            tags: '["evernote"]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
            snippet: 'Evernote <mark>import</mark>',
            rank: -1.5,
          },
        ])

      const results = await service.searchNotes('import', 'user-1')

      expect(results).toEqual([
        {
          id: 'note-1',
          title: 'Evernote import',
          description: 'Body text',
          tags: ['evernote'],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
          is_synced: 1,
          is_deleted: 0,
          snippet: 'Evernote <mark>import</mark>',
          rank: -1.5,
        },
      ])
    })

    it('falls back to LIKE query when FTS5 search yields 0 results', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'note-fallback',
            title: 'Partial match',
            description: 'Description text',
            tags: '[]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
        ])

      const results = await service.searchNotes('match', 'user-1')

      expect(results).toEqual([
        {
          id: 'note-fallback',
          title: 'Partial match',
          description: 'Description text',
          tags: [],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
          is_synced: 1,
          is_deleted: 0,
          snippet: null,
          rank: null,
        },
      ])
    })
  })

  describe('exported databaseService singleton', () => {
    it('is an instance of DatabaseService', () => {
      expect(databaseService).toBeInstanceOf(DatabaseService)
    })
  })
})
