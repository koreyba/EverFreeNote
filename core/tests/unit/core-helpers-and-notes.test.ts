import {
  DEFAULT_IMPORT_SETTINGS,
  DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE,
  fetchExistingTitles,
  normalizeNoteTitle,
  resolveExistingTitlesForImport,
} from '../../enex/import-shared'
import { logRagIndexDebugChunks } from '../../rag/debugLog'
import { NoteService } from '../../services/notes'
import { applyNoteOverlay } from '../../utils/overlay'
import { getUpdatedAtMs, mergeNoteFields, pickLatestNote } from '../../utils/noteSnapshot'
import {
  AI_SEARCH_DEBOUNCE_MS,
  AI_SEARCH_MIN_QUERY_LENGTH,
  DEFAULT_PRESET,
  OFFSET_DELTA_THRESHOLD,
  SEARCH_PRESETS,
} from '../../constants/aiSearch'
import { NOTE_CONTENT_CLASS } from '../../constants/typography'
import { SPELLCHECK_ENABLED_KEY } from '../../constants/preferences'

afterEach(() => {
  jest.restoreAllMocks()
})

type QueryResult = { data?: unknown; error?: unknown; count?: number | null }

const createQuery = (result: QueryResult) => {
  const query: Record<string, jest.Mock> = {}
  for (const method of ['select', 'eq', 'order', 'range', 'contains', 'or', 'insert', 'update', 'delete', 'in', 'single', 'maybeSingle']) {
    query[method] = jest.fn(() => query)
  }
  query.then = jest.fn((resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve))
  return query
}

const note = (overrides: Record<string, unknown> = {}) => ({
  id: 'note-1', title: 'Title', description: 'Body', tags: ['tag'], created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z', user_id: 'user', ...overrides,
})

describe('core helper modules', () => {
  it('exports immutable note snapshot and overlay behavior', () => {
    expect(getUpdatedAtMs()).toBe(Number.NEGATIVE_INFINITY)
    expect(getUpdatedAtMs({ updated_at: 'bad' })).toBe(Number.NEGATIVE_INFINITY)
    expect(pickLatestNote([null, undefined])).toBeUndefined()
    const old = { id: 'old', updated_at: '2026-01-01T00:00:00Z' }
    const latest = { id: 'new', updated_at: '2026-01-02T00:00:00Z' }
    expect(pickLatestNote([old, latest])?.id).toBe('new')
    expect(mergeNoteFields(note() as never, undefined as never)).toEqual(note())
    expect(mergeNoteFields(note() as never, { title: 'Updated', tags: [] })).toMatchObject({ title: 'Updated', tags: [] })

    const result = applyNoteOverlay(
      [note({ id: 'server', updated_at: '2026-01-01T00:00:00Z' }), note({ id: 'deleted' })] as never,
      [
        { id: 'deleted', status: 'synced', updatedAt: '2026-01-03T00:00:00Z', deleted: true },
        { id: 'local', status: 'pending', updatedAt: '2026-01-04T00:00:00Z', title: undefined, description: undefined, tags: undefined },
        { id: 'server', status: 'pending', updatedAt: '2026-01-05T00:00:00Z', title: 'Local title' },
      ] as never,
    )
    expect(result.map((entry) => entry.id)).toEqual(['server', 'local'])
    expect(result[0].title).toBe('Local title')
    expect(result[1].title).toBe('Untitled')
  })

  it('logs empty and populated RAG debug chunks', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const group = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    const groupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    logRagIndexDebugChunks('note', [])
    logRagIndexDebugChunks('note', [{ chunkIndex: 1, charOffset: 0, sectionHeading: null, title: null, content: 'x'.repeat(121) }])
    expect(info).toHaveBeenCalledWith('[rag-index] No chunks were produced for note note')
    expect(group).toHaveBeenCalledWith('[rag-index][debug] 1 chunks for note note')
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ preview: expect.stringContaining('...') }))
    expect(groupEnd).toHaveBeenCalled()
  })

  it('loads import titles, deduplicates them, and handles strategy-specific failures', async () => {
    expect(normalizeNoteTitle('  Note  ')).toBe('Note')
    expect(normalizeNoteTitle(null)).toBe('Untitled')
    expect(DEFAULT_IMPORT_SETTINGS).toEqual({ duplicateStrategy: 'prefix', skipFileDuplicates: false })
    const query = createQuery({ data: [{ id: '1', title: 'A' }, { id: '2', title: 'A' }, { id: '3', title: null }], error: null })
    const client = { from: jest.fn().mockReturnValue(query) }
    await expect(fetchExistingTitles(client as never, 'user')).resolves.toEqual(new Map([['A', '1'], ['Untitled', '3']]))
    await expect(resolveExistingTitlesForImport(client as never, 'user', 'prefix')).resolves.toEqual(new Map([['A', '1'], ['Untitled', '3']]))

    const failedQuery = createQuery({ data: null, error: { message: 'db unavailable' } })
    const failedClient = { from: jest.fn().mockReturnValue(failedQuery) }
    await expect(resolveExistingTitlesForImport(failedClient as never, 'user', 'prefix')).resolves.toBeNull()
    await expect(resolveExistingTitlesForImport(failedClient as never, 'user', 'skip')).rejects.toThrow(DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE)
  })

  it('defines shared AI search configuration values', () => {
    expect(DEFAULT_PRESET).toBe('neutral')
    expect(SEARCH_PRESETS.strict).toEqual({ topK: 5, threshold: 0.75 })
    expect(SEARCH_PRESETS.broad).toEqual({ topK: 30, threshold: 0.4 })
    expect(OFFSET_DELTA_THRESHOLD).toBe(300)
    expect(AI_SEARCH_MIN_QUERY_LENGTH).toBe(3)
    expect(AI_SEARCH_DEBOUNCE_MS).toBe(300)
    expect(NOTE_CONTENT_CLASS).toBe('note-content')
    expect(SPELLCHECK_ENABLED_KEY).toBe('editor_spellcheck_enabled')
  })
})

describe('NoteService', () => {
  it('builds paged filtered searches and returns hasMore metadata', async () => {
    const query = createQuery({ data: [note()], error: null, count: 1 })
    const service = new NoteService({ from: jest.fn().mockReturnValue(query) } as never)
    await expect(service.getNotes('user', { page: 1, pageSize: 1, tag: 'work', searchQuery: 'A,B' })).resolves.toMatchObject({
      notes: [note()], totalCount: 1, hasMore: true, nextCursor: 2,
    })
    expect(query.range).toHaveBeenCalledWith(1, 1)
    expect(query.contains).toHaveBeenCalledWith('tags', ['work'])
    expect(query.or).toHaveBeenCalledWith('title.ilike.%a b%,description.ilike.%a b%')
  })

  it('creates, updates and deletes notes and propagates errors', async () => {
    const query = createQuery({ data: note(), error: null })
    const from = jest.fn().mockReturnValue(query)
    const service = new NoteService({ from } as never)
    await expect(service.createNote({ title: 'T', description: 'D', tags: [], userId: 'u', id: 'id' })).resolves.toEqual(note())
    await expect(service.updateNote('id', { title: 'New' })).resolves.toEqual(note())
    await expect(service.deleteNote('id')).resolves.toBe('id')
    await expect(service.getNote('id')).resolves.toEqual(note())
    expect(from).toHaveBeenCalledTimes(4)

    const failed = createQuery({ data: null, error: new Error('db') })
    const failedService = new NoteService({ from: jest.fn().mockReturnValue(failed) } as never)
    await expect(failedService.createNote({ title: 'T', description: 'D', tags: [], userId: 'u' })).rejects.toThrow('db')
    await expect(failedService.updateNote('id', {})).rejects.toThrow('db')
    await expect(failedService.deleteNote('id')).rejects.toThrow('db')
    await expect(failedService.getNote('id')).rejects.toThrow('db')
  })

  it('distinguishes found, missing and transient note status and handles empty ids', async () => {
    const found = createQuery({ data: note(), error: null })
    const service = new NoteService({ from: jest.fn().mockReturnValueOnce(found).mockReturnValue(createQuery({ data: [note()], error: null })) } as never)
    await expect(service.getNoteStatus('id')).resolves.toMatchObject({ status: 'found', note: note() })
    await expect(service.getNotesByIds([], 'user')).resolves.toEqual([])
    await expect(service.getNotesByIds(['id'], 'user')).resolves.toEqual([note()])

    const missing = createQuery({ data: null, error: null })
    await expect(new NoteService({ from: jest.fn().mockReturnValue(missing) } as never).getNoteStatus('id')).resolves.toEqual({ status: 'not_found' })
    const failed = createQuery({ data: null, error: new Error('temporary') })
    await expect(new NoteService({ from: jest.fn().mockReturnValue(failed) } as never).getNoteStatus('id')).resolves.toMatchObject({ status: 'transient_error' })
    await expect(new NoteService({ from: jest.fn().mockReturnValue(failed) } as never).getNotesByIds(['id'], 'user')).rejects.toThrow('temporary')
  })
})
