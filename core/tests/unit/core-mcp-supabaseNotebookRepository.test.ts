import type { SupabaseClient } from '@supabase/supabase-js'

import {
  NOTE_COLUMNS,
  createSupabaseNotebookRepository,
  escapeIlikeValue,
  toNoteRecord,
} from '@core/mcp/supabaseNotebookRepository'

type QueryResult = { data?: unknown; error?: unknown; count?: number | null }

function createBuilder(result: QueryResult) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    contains: jest.fn(),
    or: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  }
  for (const key of ['select', 'insert', 'update', 'eq', 'order', 'range', 'contains', 'or']) {
    builder[key].mockReturnValue(builder)
  }
  builder.maybeSingle.mockResolvedValue({ data: result.data ?? null, error: result.error ?? null })
  builder.single.mockResolvedValue({ data: result.data ?? null, error: result.error ?? null })
  // Awaiting the builder itself resolves the list query.
  builder.then = (resolve: (value: QueryResult) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }).then(resolve)
  return builder
}

function createClient(result: QueryResult) {
  const builder = createBuilder(result)
  const from = jest.fn().mockReturnValue(builder)
  const supabase = { from } as unknown as SupabaseClient
  return { supabase, from, builder }
}

const userId = 'user-1'
const row = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Hello',
  description: '<p>Body</p>',
  tags: ['a', 'b'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

/** What toNoteRecord() should produce for `row`. */
const record = {
  id: row.id,
  title: row.title,
  contentHtml: row.description,
  tags: row.tags,
  created_at: row.created_at,
  updated_at: row.updated_at,
}

describe('core/mcp/supabaseNotebookRepository', () => {
  describe('helpers', () => {
    it('escapes characters that break PostgREST quoted values', () => {
      expect(escapeIlikeValue(' a"b\\c ')).toBe('abc')
    })

    it('normalises nullable columns into a NoteRecord', () => {
      expect(
        toNoteRecord({ id: 'x', title: null, description: null, tags: ['t', 3, null], created_at: null, updated_at: null }),
      ).toEqual({ id: 'x', title: '', contentHtml: '', tags: ['t'], created_at: null, updated_at: null })
      expect(toNoteRecord({ ...row, tags: 'not-an-array' }).tags).toEqual([])
    })
  })

  describe('listNotes', () => {
    it('lists the user notes ordered by recency with pagination and exact count', async () => {
      const { supabase, from, builder } = createClient({ data: [row], count: 42 })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      const result = await repository.listNotes({ query: null, tag: null, limit: 20, offset: 40 })

      expect(from).toHaveBeenCalledWith('notes')
      expect(builder.select).toHaveBeenCalledWith(NOTE_COLUMNS, { count: 'exact' })
      expect(builder.eq).toHaveBeenCalledWith('user_id', userId)
      expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false })
      expect(builder.range).toHaveBeenCalledWith(40, 59)
      expect(builder.contains).not.toHaveBeenCalled()
      expect(builder.or).not.toHaveBeenCalled()
      expect(result).toEqual({ notes: [record], total: 42 })
    })

    it('applies tag and text filters', async () => {
      const { supabase, builder } = createClient({ data: [], count: 0 })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await repository.listNotes({ query: ' foo"bar ', tag: 'work', limit: 5, offset: 0 })

      expect(builder.contains).toHaveBeenCalledWith('tags', ['work'])
      expect(builder.or).toHaveBeenCalledWith('title.ilike."%foobar%",description.ilike."%foobar%"')
    })

    it('skips the text filter when the query is blank after escaping', async () => {
      const { supabase, builder } = createClient({ data: [], count: 0 })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await repository.listNotes({ query: '"', tag: null, limit: 5, offset: 0 })

      expect(builder.or).not.toHaveBeenCalled()
    })

    it('falls back to offset + rows when the count is missing', async () => {
      const { supabase } = createClient({ data: [row, row], count: null })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      const result = await repository.listNotes({ query: null, tag: null, limit: 2, offset: 10 })

      expect(result.total).toBe(12)
    })

    it('handles a null data payload', async () => {
      const { supabase } = createClient({ data: null, count: 0 })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.listNotes({ query: null, tag: null, limit: 2, offset: 0 })).resolves.toEqual({
        notes: [],
        total: 0,
      })
    })

    it('rethrows database errors', async () => {
      const error = { message: 'boom' }
      const { supabase } = createClient({ error })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.listNotes({ query: null, tag: null, limit: 2, offset: 0 })).rejects.toEqual(error)
    })
  })

  describe('getNote', () => {
    it('returns the note scoped to the user', async () => {
      const { supabase, builder } = createClient({ data: row })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.getNote(row.id)).resolves.toEqual(record)
      expect(builder.select).toHaveBeenCalledWith(NOTE_COLUMNS)
      expect(builder.eq).toHaveBeenCalledWith('id', row.id)
      expect(builder.eq).toHaveBeenCalledWith('user_id', userId)
      expect(builder.maybeSingle).toHaveBeenCalled()
    })

    it('returns null when nothing matches', async () => {
      const { supabase } = createClient({ data: null })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.getNote(row.id)).resolves.toBeNull()
    })

    it('rethrows database errors', async () => {
      const { supabase } = createClient({ error: { message: 'nope' } })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.getNote(row.id)).rejects.toEqual({ message: 'nope' })
    })
  })

  describe('createNote', () => {
    it('inserts with the user id and returns the created row', async () => {
      const { supabase, builder } = createClient({ data: row })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      const created = await repository.createNote({ title: 'Hello', contentHtml: '<p>Body</p>', tags: ['a', 'b'] })

      expect(builder.insert).toHaveBeenCalledWith([
        { title: 'Hello', description: '<p>Body</p>', tags: ['a', 'b'], user_id: userId },
      ])
      expect(builder.select).toHaveBeenCalledWith(NOTE_COLUMNS)
      expect(builder.single).toHaveBeenCalled()
      expect(created).toEqual(record)
    })

    it('rethrows database errors', async () => {
      const { supabase } = createClient({ error: { message: 'insert failed' } })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.createNote({ title: 't', contentHtml: '', tags: [] })).rejects.toEqual({
        message: 'insert failed',
      })
    })
  })

  describe('updateNote', () => {
    it('updates only the provided fields, scoped to the user', async () => {
      const { supabase, builder } = createClient({ data: row })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      const updated = await repository.updateNote(row.id, { title: 'New', tags: ['x'] })

      expect(builder.update).toHaveBeenCalledWith({ title: 'New', tags: ['x'] })
      expect(builder.eq).toHaveBeenCalledWith('id', row.id)
      expect(builder.eq).toHaveBeenCalledWith('user_id', userId)
      expect(builder.maybeSingle).toHaveBeenCalled()
      expect(updated).toEqual(record)
    })

    it('passes the description through', async () => {
      const { supabase, builder } = createClient({ data: row })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await repository.updateNote(row.id, { contentHtml: '<p>x</p>' })

      expect(builder.update).toHaveBeenCalledWith({ description: '<p>x</p>' })
    })

    it('returns null when no row was updated', async () => {
      const { supabase } = createClient({ data: null })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.updateNote(row.id, { title: 'x' })).resolves.toBeNull()
    })

    it('reads the note instead of updating when the patch is empty', async () => {
      const { supabase, builder } = createClient({ data: row })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.updateNote(row.id, {})).resolves.toEqual(record)
      expect(builder.update).not.toHaveBeenCalled()
      expect(builder.select).toHaveBeenCalledWith(NOTE_COLUMNS)
    })

    it('rethrows database errors', async () => {
      const { supabase } = createClient({ error: { message: 'update failed' } })
      const repository = createSupabaseNotebookRepository(supabase, userId)

      await expect(repository.updateNote(row.id, { title: 'x' })).rejects.toEqual({ message: 'update failed' })
    })
  })
})
