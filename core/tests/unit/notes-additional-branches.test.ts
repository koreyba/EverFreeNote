import { NoteService } from '@core/services/notes'

type QueryResult = {
  data?: unknown
  error?: unknown
  count?: number | null
}

const createQuery = (result: QueryResult) => {
  const query: Record<string, jest.Mock> = {}
  for (const method of ['select', 'eq', 'order', 'range', 'contains', 'or', 'insert', 'in', 'single', 'maybeSingle']) {
    query[method] = jest.fn(() => query)
  }
  query.then = jest.fn((resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve))
  return query
}

const note = (id = 'note-1') => ({
  id,
  title: `Title ${id}`,
  description: 'Body',
  tags: ['work'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  user_id: 'user-1',
})

describe('core/services/notes additional branch behavior', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses default pagination and returns empty metadata when the page data is null', async () => {
    const query = createQuery({ data: null, error: null, count: null })
    const from = jest.fn().mockReturnValue(query)
    const service = new NoteService({ from } as never)

    await expect(service.getNotes('user-1')).resolves.toEqual({
      notes: [],
      totalCount: 0,
      hasMore: false,
      nextCursor: undefined,
    })

    expect(query.range).toHaveBeenCalledWith(0, 49)
    expect(query.contains).not.toHaveBeenCalled()
    expect(query.or).not.toHaveBeenCalled()
  })

  it('returns a non-full page without a next cursor when optional filters are absent', async () => {
    const query = createQuery({ data: [note()], error: null, count: 5 })
    const service = new NoteService({ from: jest.fn().mockReturnValue(query) } as never)

    await expect(service.getNotes('user-1', { page: 2, pageSize: 3, tag: null, searchQuery: '' })).resolves.toMatchObject({
      notes: [note()],
      totalCount: 5,
      hasMore: false,
      nextCursor: undefined,
    })

    expect(query.range).toHaveBeenCalledWith(6, 8)
    expect(query.contains).not.toHaveBeenCalled()
    expect(query.or).not.toHaveBeenCalled()
  })

  it('applies tag and comma-safe search filters and advances a full page', async () => {
    const rows = [note('note-1'), note('note-2')]
    const query = createQuery({ data: rows, error: null, count: 4 })
    const service = new NoteService({ from: jest.fn().mockReturnValue(query) } as never)

    await expect(service.getNotes('user-1', { page: 1, pageSize: 2, tag: 'work', searchQuery: 'A,B' })).resolves.toMatchObject({
      notes: rows,
      totalCount: 4,
      hasMore: true,
      nextCursor: 2,
    })

    expect(query.contains).toHaveBeenCalledWith('tags', ['work'])
    expect(query.or).toHaveBeenCalledWith('title.ilike.%a b%,description.ilike.%a b%')
    expect(query.range).toHaveBeenCalledWith(2, 3)
  })

  it('creates notes with and without an explicit id and returns null data', async () => {
    const withIdQuery = createQuery({ data: note('provided-id'), error: null })
    const withoutIdQuery = createQuery({ data: null, error: null })
    const from = jest.fn().mockReturnValueOnce(withIdQuery).mockReturnValueOnce(withoutIdQuery)
    const service = new NoteService({ from } as never)

    await expect(service.createNote({ id: 'provided-id', title: 'With id', description: 'Body', tags: [], userId: 'user-1' }))
      .resolves.toEqual(note('provided-id'))
    await expect(service.createNote({ title: 'Without id', description: 'Body', tags: [], userId: 'user-1' }))
      .resolves.toBeNull()

    expect(withIdQuery.insert).toHaveBeenCalledWith([{
      id: 'provided-id',
      title: 'With id',
      description: 'Body',
      tags: [],
      user_id: 'user-1',
    }])
    expect(withoutIdQuery.insert).toHaveBeenCalledWith([{
      title: 'Without id',
      description: 'Body',
      tags: [],
      user_id: 'user-1',
    }])
  })

  it('propagates getNotes and createNote errors', async () => {
    const getNotesError = new Error('notes unavailable')
    const createError = new Error('insert failed')
    const getNotesService = new NoteService({ from: jest.fn().mockReturnValue(createQuery({ data: null, error: getNotesError })) } as never)
    const createService = new NoteService({ from: jest.fn().mockReturnValue(createQuery({ data: null, error: createError })) } as never)

    await expect(getNotesService.getNotes('user-1')).rejects.toBe(getNotesError)
    await expect(createService.createNote({ title: 'Title', description: 'Body', tags: [], userId: 'user-1' })).rejects.toBe(createError)
  })

  it('returns no query for empty ids, maps non-empty results, and handles null data and errors', async () => {
    const emptyFrom = jest.fn()
    await expect(new NoteService({ from: emptyFrom } as never).getNotesByIds([], 'user-1')).resolves.toEqual([])
    expect(emptyFrom).not.toHaveBeenCalled()

    const rows = [note('note-1'), note('note-2')]
    const query = createQuery({ data: rows, error: null })
    const service = new NoteService({ from: jest.fn().mockReturnValue(query) } as never)
    await expect(service.getNotesByIds(['note-1', 'note-2'], 'user-1')).resolves.toEqual(rows)
    expect(query.in).toHaveBeenCalledWith('id', ['note-1', 'note-2'])
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')

    const nullDataService = new NoteService({ from: jest.fn().mockReturnValue(createQuery({ data: null, error: null })) } as never)
    await expect(nullDataService.getNotesByIds(['missing'], 'user-1')).resolves.toEqual([])

    const idsError = new Error('lookup failed')
    const errorService = new NoteService({ from: jest.fn().mockReturnValue(createQuery({ data: null, error: idsError })) } as never)
    await expect(errorService.getNotesByIds(['note-1'], 'user-1')).rejects.toBe(idsError)
  })
})
