import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { createMockNote, createTestQueryClient, TEST_USER_ID } from '../testUtils'
import { getCachedNote, updateNoteCaches } from '@ui/mobile/utils/noteCache'

type NotesPage = {
  notes: Note[]
  totalCount: number
  hasMore: boolean
  nextCursor?: number
}

type SearchResult = Omit<Note, 'title' | 'description' | 'tags' | 'user_id'> & {
  title: string | null
  description: string | null
  tags: string[] | null
  user_id?: string
  snippet?: string | null
  headline?: string | null
  rank?: number | null
}

type SearchPage = {
  results: SearchResult[]
  total: number
  hasMore: boolean
  nextCursor?: number
  method?: string
}

const notesQueryKey = ['notes', TEST_USER_ID, { pageSize: 50, tag: null, searchQuery: '' }]
const searchQueryKey = ['search', TEST_USER_ID, 'query', null]

const buildNotesData = (notes: Note[], additionalPages: Note[][] = []): InfiniteData<NotesPage> => {
  const pages = [notes, ...additionalPages]

  return {
    pages: pages.map((pageNotes, index) => ({
      notes: pageNotes,
      totalCount: pageNotes.length,
      hasMore: index < pages.length - 1,
    })),
    pageParams: pages.map((_, index) => index),
  }
}

const buildSearchData = (
  results: SearchPage['results'],
  additionalPages: SearchPage['results'][] = []
): InfiniteData<SearchPage> => {
  const pages = [results, ...additionalPages]

  return {
    pages: pages.map((pageResults, index) => ({
      results: pageResults,
      total: pageResults.length,
      hasMore: index < pages.length - 1,
    })),
    pageParams: pages.map((_, index) => index),
  }
}

const buildNoteDetailData = (note: Note | null, status: 'found' | 'missing' | 'deleted' = 'found') => ({
  note,
  status,
})

describe('noteCache utilities', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('returns the freshest cached note across queries', () => {
    const noteId = 'note-1'
    const older = createMockNote({
      id: noteId,
      description: 'older',
      updated_at: '2025-01-01T10:00:00.000Z',
    })
    const newer = createMockNote({
      id: noteId,
      description: 'newer',
      updated_at: '2025-01-02T10:00:00.000Z',
    })

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(older))
    queryClient.setQueryData(notesQueryKey, buildNotesData([newer]))

    const cached = getCachedNote(queryClient, noteId)

    expect(cached?.description).toBe('newer')
  })

  it('returns the freshest search result over stale detail, list, and fallback notes', () => {
    const noteId = 'note-search-freshness'
    const detailNote = createMockNote({
      id: noteId,
      updated_at: '2025-01-01T08:00:00.000Z',
    })
    const listNote = createMockNote({
      id: noteId,
      updated_at: '2025-01-02T08:00:00.000Z',
    })
    const searchResult = {
      ...createMockNote({
        id: noteId,
        title: 'Newest search title',
        updated_at: '2025-01-03T08:00:00.000Z',
      }),
      snippet: 'Search snippet',
      headline: 'Search headline',
    }
    const fallback = createMockNote({
      id: noteId,
      updated_at: '2024-12-31T08:00:00.000Z',
    })

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(detailNote))
    queryClient.setQueryData(notesQueryKey, buildNotesData([listNote]))
    queryClient.setQueryData(searchQueryKey, buildSearchData([searchResult]))

    const cached = getCachedNote(queryClient, noteId, fallback)

    expect(cached).toEqual(searchResult)
  })

  it('returns the fallback note when query caches miss', () => {
    const fallback = createMockNote({ id: 'note-fallback' })

    expect(getCachedNote(queryClient, fallback.id, fallback)).toBe(fallback)
  })

  it('returns undefined when no cache or fallback contains the requested note', () => {
    expect(getCachedNote(queryClient, 'note-absent')).toBeUndefined()
  })

  it('updates note, notes, and search caches consistently', () => {
    const noteId = 'note-2'
    const detailBase = createMockNote({
      id: noteId,
      title: 'Old title',
      description: 'Old description',
      updated_at: '2025-01-01T08:00:00.000Z',
    })
    const listBase = { ...detailBase }
    const searchResult = {
      ...detailBase,
      snippet: 'Snippet',
      headline: 'Headline',
    }
    const notesData: InfiniteData<NotesPage> = {
      pages: [{
        notes: [listBase],
        totalCount: 7,
        hasMore: true,
        nextCursor: 1,
      }],
      pageParams: [0],
    }
    const searchData: InfiniteData<SearchPage> = {
      pages: [{
        results: [searchResult],
        total: 9,
        hasMore: true,
        nextCursor: 2,
        method: 'fts',
      }],
      pageParams: [0],
    }

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(detailBase))
    queryClient.setQueryData(notesQueryKey, notesData)
    queryClient.setQueryData(searchQueryKey, searchData)

    updateNoteCaches(queryClient, noteId, {
      title: 'New title',
      description: 'New description',
    }, { updatedAt: '2025-01-02T09:00:00.000Z' })

    const noteCache = queryClient.getQueryData<{ note: Note | null; status: 'found' | 'missing' | 'deleted' }>(['note', noteId])
    const notesCache = queryClient.getQueryData<InfiniteData<NotesPage>>(notesQueryKey)
    const searchCache = queryClient.getQueryData<InfiniteData<SearchPage>>(searchQueryKey)

    expect(noteCache?.status).toBe('found')
    expect(noteCache?.note?.title).toBe('New title')
    expect(noteCache?.note?.description).toBe('New description')
    expect(noteCache?.note?.updated_at).toBe('2025-01-02T09:00:00.000Z')

    expect(notesCache?.pages[0].notes[0].title).toBe('New title')
    expect(notesCache?.pages[0].notes[0].description).toBe('New description')
    expect(notesCache?.pageParams).toEqual([0])
    expect(notesCache?.pages[0].totalCount).toBe(7)
    expect(notesCache?.pages[0].hasMore).toBe(true)
    expect(notesCache?.pages[0].nextCursor).toBe(1)

    expect(searchCache?.pages[0].results[0].title).toBe('New title')
    expect(searchCache?.pages[0].results[0].description).toBe('New description')
    expect(searchCache?.pages[0].results[0].snippet).toBe('Snippet')
    expect(searchCache?.pageParams).toEqual([0])
    expect(searchCache?.pages[0].total).toBe(9)
    expect(searchCache?.pages[0].hasMore).toBe(true)
    expect(searchCache?.pages[0].nextCursor).toBe(2)
    expect(searchCache?.pages[0].method).toBe('fts')
  })

  it('applies a tags-only patch across every matching page without changing omitted fields or search metadata', () => {
    const noteId = 'note-tags'
    const detailTarget = createMockNote({
      id: noteId,
      title: 'Keep this title',
      description: 'Keep this description',
      tags: ['old'],
      updated_at: '2025-01-01T08:00:00.000Z',
    })
    const firstPageTarget = { ...detailTarget }
    const secondPageListTarget = createMockNote({
      id: noteId,
      title: 'Second page title',
      tags: ['old'],
      updated_at: '2025-01-01T09:00:00.000Z',
    })
    const secondPageSearchTarget = { ...secondPageListTarget }
    const unrelatedList = createMockNote({ id: 'note-unrelated-list', tags: ['unchanged'] })
    const unrelatedSearch = createMockNote({ id: 'note-unrelated-search', tags: ['unchanged'] })
    const searchResult = {
      ...firstPageTarget,
      snippet: 'Original snippet',
      headline: 'Original headline',
    }

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(detailTarget))
    queryClient.setQueryData(
      notesQueryKey,
      buildNotesData([firstPageTarget, unrelatedList], [[unrelatedList, secondPageListTarget]])
    )
    queryClient.setQueryData(searchQueryKey, buildSearchData([searchResult, unrelatedSearch], [[secondPageSearchTarget]]))

    updateNoteCaches(queryClient, noteId, { tags: ['new', 'important'] })

    const noteCache = queryClient.getQueryData<{ note: Note | null }>(['note', noteId])
    const notesCache = queryClient.getQueryData<InfiniteData<NotesPage>>(notesQueryKey)
    const searchCache = queryClient.getQueryData<InfiniteData<SearchPage>>(searchQueryKey)

    expect(noteCache?.note).toEqual(expect.objectContaining({
      title: 'Keep this title',
      description: 'Keep this description',
      tags: ['new', 'important'],
      updated_at: '2025-01-01T08:00:00.000Z',
    }))
    expect(notesCache?.pages.map((page) => page.notes.map((note) => ({ id: note.id, tags: note.tags })))).toEqual([
      [
        { id: noteId, tags: ['new', 'important'] },
        { id: 'note-unrelated-list', tags: ['unchanged'] },
      ],
      [
        { id: 'note-unrelated-list', tags: ['unchanged'] },
        { id: noteId, tags: ['new', 'important'] },
      ],
    ])
    expect(searchCache?.pages.map((page) => page.results.map((result) => ({
      id: result.id,
      tags: result.tags,
      snippet: result.snippet,
      headline: result.headline,
    })))).toEqual([
      [
        { id: noteId, tags: ['new', 'important'], snippet: 'Original snippet', headline: 'Original headline' },
        { id: 'note-unrelated-search', tags: ['unchanged'], snippet: undefined, headline: undefined },
      ],
      [{ id: noteId, tags: ['new', 'important'], snippet: undefined, headline: undefined }],
    ])
  })

  it('does not create or alter cache entries when there is no update to apply', () => {
    const noteId = 'note-no-update'
    const note = createMockNote({ id: noteId, tags: ['original'] })
    const notesData = buildNotesData([note])

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(note))
    queryClient.setQueryData(notesQueryKey, notesData)

    updateNoteCaches(queryClient, noteId, {}, { updatedAt: '' })

    expect(queryClient.getQueryData(['note', noteId])).toEqual(buildNoteDetailData(note))
    expect(queryClient.getQueryData(notesQueryKey)).toEqual(notesData)
  })

  it('normalizes a direct note detail cache to found status while applying an update', () => {
    const noteId = 'note-direct-detail'
    const note = createMockNote({ id: noteId, title: 'Old title' })

    queryClient.setQueryData(['note', noteId], note)

    updateNoteCaches(queryClient, noteId, { title: 'New title' })

    expect(queryClient.getQueryData(['note', noteId])).toEqual({
      note: { ...note, title: 'New title' },
      status: 'found',
    })
  })

  it('does not create a detail cache entry for an uncached note', () => {
    const noteId = 'note-uncached'
    const unrelatedList = createMockNote({ id: 'note-unrelated-list' })
    const unrelatedSearch = createMockNote({ id: 'note-unrelated-search' })

    queryClient.setQueryData(notesQueryKey, buildNotesData([unrelatedList]))
    queryClient.setQueryData(searchQueryKey, buildSearchData([unrelatedSearch]))

    updateNoteCaches(queryClient, noteId, { description: 'Should not create a note' })

    expect(queryClient.getQueryData(['note', noteId])).toBeUndefined()
    expect(queryClient.getQueryData(notesQueryKey)).toEqual(buildNotesData([unrelatedList]))
    expect(queryClient.getQueryData(searchQueryKey)).toEqual(buildSearchData([unrelatedSearch]))
  })

  it('preserves nullable search result fields while applying a title update', () => {
    const noteId = 'note-nullable-search-result'
    const nullableSearchResult: SearchResult = {
      id: noteId,
      title: null,
      description: null,
      tags: null,
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: '2025-01-01T08:00:00.000Z',
      snippet: null,
      headline: null,
      rank: null,
    }

    queryClient.setQueryData(searchQueryKey, buildSearchData([nullableSearchResult]))

    updateNoteCaches(queryClient, noteId, { title: 'Updated nullable title' })

    const searchCache = queryClient.getQueryData<InfiniteData<SearchPage>>(searchQueryKey)

    expect(searchCache?.pages[0].results[0]).toEqual({
      ...nullableSearchResult,
      title: 'Updated nullable title',
    })
  })

  it('creates a found note-detail cache entry from list cache fallback', () => {
    const noteId = 'note-3'
    const base = createMockNote({
      id: noteId,
      title: 'List title',
      description: 'List description',
      updated_at: '2025-01-01T08:00:00.000Z',
    })

    queryClient.setQueryData(notesQueryKey, buildNotesData([base]))

    updateNoteCaches(queryClient, noteId, {
      description: 'Fresh description',
    }, { updatedAt: '2025-01-02T09:00:00.000Z' })

    const noteCache = queryClient.getQueryData<{ note: Note | null; status: 'found' | 'missing' | 'deleted' }>(['note', noteId])

    expect(noteCache).toEqual({
      note: expect.objectContaining({
        id: noteId,
        title: 'List title',
        description: 'Fresh description',
        updated_at: '2025-01-02T09:00:00.000Z',
      }),
      status: 'found',
    })
  })

  it('preserves missing tombstones instead of resurrecting stale list cache data', () => {
    const noteId = 'note-4'
    const staleListNote = createMockNote({
      id: noteId,
      title: 'Stale list note',
      description: 'Old description',
      updated_at: '2025-01-01T08:00:00.000Z',
    })

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(null, 'missing'))
    queryClient.setQueryData(notesQueryKey, buildNotesData([staleListNote]))

    updateNoteCaches(queryClient, noteId, {
      description: 'Should not be applied',
    }, { updatedAt: '2025-01-02T09:00:00.000Z' })

    const noteCache = queryClient.getQueryData<{ note: Note | null; status: 'found' | 'missing' | 'deleted' }>(['note', noteId])

    expect(noteCache).toEqual({
      note: null,
      status: 'missing',
    })
  })

  it('preserves deleted tombstones instead of resurrecting stale search cache data', () => {
    const noteId = 'note-deleted'
    const staleSearchNote = createMockNote({
      id: noteId,
      title: 'Deleted search note',
      updated_at: '2025-01-01T08:00:00.000Z',
    })

    queryClient.setQueryData(['note', noteId], buildNoteDetailData(null, 'deleted'))
    queryClient.setQueryData(searchQueryKey, buildSearchData([staleSearchNote]))

    updateNoteCaches(queryClient, noteId, {
      title: 'Should not resurrect the detail note',
    }, { updatedAt: '2025-01-02T09:00:00.000Z' })

    expect(queryClient.getQueryData(['note', noteId])).toEqual({
      note: null,
      status: 'deleted',
    })
  })
})
