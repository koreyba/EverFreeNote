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

    it('checks existing notes but does not insert tags when the database has no notes', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      await service.init()

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) as count FROM note_tags')
      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(2, 'SELECT id, tags FROM notes')
      expect(mockDb.runAsync).not.toHaveBeenCalled()
    })

    it('propagates a database-open failure without executing the schema', async () => {
      mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('Unable to open database'))

      await expect(service.init()).rejects.toThrow('Unable to open database')
      expect(mockDb.execAsync).not.toHaveBeenCalled()
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

    it('preserves legacy string tags and defaults missing sync flags', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 1 }])

      await service.saveNotes([
        {
          id: 'legacy-note',
          title: 'Legacy note',
          description: 'Imported note',
          tags: '["Imported"]' as unknown as string[],
          user_id: 'user-1',
          created_at: '2026-07-24T12:00:00Z',
          updated_at: '2026-07-24T12:00:00Z',
        },
      ])

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO notes'),
        ['legacy-note', 'Legacy note', 'Imported note', '["Imported"]', 'user-1', '2026-07-24T12:00:00Z', '2026-07-24T12:00:00Z', 1, 0]
      )
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO note_tags (note_id, tag) VALUES (?, ?)',
        ['legacy-note', 'Imported']
      )
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
            description: '',
            tags: [],
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
          },
        ])
      ).rejects.toThrow('DB failure')

      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('replaceNotesForUser', () => {
    it('removes the synced snapshot when the remote result is empty while preserving pending notes', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ id: 'pending-note' }])

      await service.replaceNotesForUser('user-1', [])

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM note_tags WHERE note_id IN (SELECT id FROM notes WHERE user_id = ? AND is_synced = 1)',
        ['user-1']
      )
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM notes WHERE user_id = ? AND is_synced = 1',
        ['user-1']
      )
      expect(mockDb.runAsync).not.toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO notes'), expect.anything())
      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT')
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

    it('maps null and non-array tag JSON values to empty tag lists', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'note-without-tags',
            title: 'No tags',
            description: '',
            tags: null,
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
          {
            id: 'note-with-object-tags',
            title: 'Object tags',
            description: '',
            tags: '{"value":"not-an-array"}',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
        ])

      const notes = await service.getLocalNotes('user-1')

      expect(notes).toEqual([
        expect.objectContaining({ id: 'note-without-tags', tags: [] }),
        expect.objectContaining({ id: 'note-with-object-tags', tags: [] }),
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

    it('uses default pagination and returns zero when the total count row is absent', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await service.getLocalNotesByTag('user-1', 'important')

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT ? OFFSET ?'),
        ['user-1', 'important', 50, 0]
      )
      expect(result).toEqual({ notes: [], total: 0 })
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

    it('hasPendingWrites returns false when the count row is absent', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])
      mockDb.getFirstAsync.mockResolvedValueOnce(null)

      await expect(service.hasPendingWrites('note-1')).resolves.toBe(false)
    })

    it('markQueueItemStatus updates status and lastError in database', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      await service.markQueueItemStatus('q-1', 'failed', 'Timeout error')

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE mutation_queue SET status = ?, lastError = ?, attempts = attempts + 1 WHERE id = ?',
        ['failed', 'Timeout error', 'q-1']
      )
    })

    it('stores a null lastError when queue status has no error message', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }])

      await service.markQueueItemStatus('q-1', 'pending')

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE mutation_queue SET status = ?, lastError = ?, attempts = attempts + 1 WHERE id = ?',
        ['pending', null, 'q-1']
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

    it('applies tag and pagination options to the LIKE fallback search', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'tagged-fallback',
            title: 'Tagged match',
            description: 'Description text',
            tags: '["important"]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
          },
        ])

      const results = await service.searchNotes('  match  ', 'user-1', {
        limit: 5,
        offset: 3,
        tag: 'important',
      })

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('JOIN note_tags nt ON nt.note_id = n.id'),
        ['match', 'user-1', 'important', 5, 3]
      )
      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('AND nt.tag = ?'),
        ['user-1', 'important', '%match%', '%match%', 5, 3]
      )
      expect(results).toEqual([
        expect.objectContaining({
          id: 'tagged-fallback',
          tags: ['important'],
          snippet: null,
          rank: null,
        }),
      ])
    })

    it('does not use the LIKE fallback for a whitespace-only query', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([])

      const results = await service.searchNotes('   ', 'user-1')

      expect(results).toEqual([])
      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(2)
      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('MATCH ?'),
        ['', 'user-1', 50, 0]
      )
      expect(mockDb.getAllAsync.mock.calls[1][0]).not.toContain('LIKE ?')
    })

    it('treats a whitespace-only tag as no tag filter', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'untagged-search-result',
            title: 'Search result',
            description: 'Body text',
            tags: '[]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
            snippet: '<mark>match</mark>',
            rank: -0.5,
          },
        ])

      const results = await service.searchNotes('match', 'user-1', { tag: '   ' })
      const ftsQuery = String(mockDb.getAllAsync.mock.calls[1][0])

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('MATCH ?'),
        ['match', 'user-1', 50, 0]
      )
      expect(ftsQuery).not.toContain('JOIN note_tags nt ON nt.note_id = n.id')
      expect(ftsQuery).not.toContain('AND nt.tag = ?')
      expect(results).toEqual([
        expect.objectContaining({
          id: 'untagged-search-result',
          tags: [],
          snippet: '<mark>match</mark>',
          rank: -0.5,
        }),
      ])
    })

    it('omits a missing FTS snippet while preserving the search rank', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'no-snippet',
            title: 'Search result',
            description: 'Body text',
            tags: '[]',
            user_id: 'user-1',
            created_at: '2026-07-24T12:00:00Z',
            updated_at: '2026-07-24T12:00:00Z',
            is_synced: 1,
            is_deleted: 0,
            snippet: null,
            rank: -0.25,
          },
        ])

      const results = await service.searchNotes('result', 'user-1')

      expect(results).toEqual([
        expect.objectContaining({
          id: 'no-snippet',
          snippet: undefined,
          rank: -0.25,
        }),
      ])
    })
  })

  describe('exported databaseService singleton', () => {
    it('is an instance of DatabaseService', () => {
      expect(databaseService).toBeInstanceOf(DatabaseService)
    })
  })
})
