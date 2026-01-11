import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { createMockNote, createTestQueryClient, TEST_USER_ID } from '../testUtils'
import { getCachedNote, updateNoteCaches } from '@ui/mobile/utils/noteCache'

type NotesPage = {
  notes: Note[]
  totalCount: number
  hasMore: boolean
}

type SearchPage = {
  results: Array<Note & { snippet?: string | null; headline?: string | null }>
  total: number
  hasMore: boolean
}

const notesQueryKey = ['notes', TEST_USER_ID, { pageSize: 50, tag: null, searchQuery: '' }]
const searchQueryKey = ['search', TEST_USER_ID, 'query', null]

const buildNotesData = (notes: Note[]): InfiniteData<NotesPage> => ({
  pages: [
    {
      notes,
      totalCount: notes.length,
      hasMore: false,
    },
  ],
  pageParams: [0],
})

const buildSearchData = (results: SearchPage['results']): InfiniteData<SearchPage> => ({
  pages: [
    {
      results,
      total: results.length,
      hasMore: false,
    },
  ],
  pageParams: [0],
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

    queryClient.setQueryData(['note', noteId], older)
    queryClient.setQueryData(notesQueryKey, buildNotesData([newer]))

    const cached = getCachedNote(queryClient, noteId)

    expect(cached?.description).toBe('newer')
  })

  it('updates note, notes, and search caches consistently', () => {
    const noteId = 'note-2'
    const base = createMockNote({
      id: noteId,
      title: 'Old title',
      description: 'Old description',
      updated_at: '2025-01-01T08:00:00.000Z',
    })
    const searchResult = {
      ...base,
      snippet: 'Snippet',
      headline: 'Headline',
    }

    queryClient.setQueryData(['note', noteId], base)
    queryClient.setQueryData(notesQueryKey, buildNotesData([base]))
    queryClient.setQueryData(searchQueryKey, buildSearchData([searchResult]))

    updateNoteCaches(queryClient, noteId, {
      title: 'New title',
      description: 'New description',
    }, { updatedAt: '2025-01-02T09:00:00.000Z' })

    const noteCache = queryClient.getQueryData<Note>(['note', noteId])
    const notesCache = queryClient.getQueryData<InfiniteData<NotesPage>>(notesQueryKey)
    const searchCache = queryClient.getQueryData<InfiniteData<SearchPage>>(searchQueryKey)

    expect(noteCache?.title).toBe('New title')
    expect(noteCache?.description).toBe('New description')
    expect(noteCache?.updated_at).toBe('2025-01-02T09:00:00.000Z')

    expect(notesCache?.pages[0].notes[0].title).toBe('New title')
    expect(notesCache?.pages[0].notes[0].description).toBe('New description')

    expect(searchCache?.pages[0].results[0].title).toBe('New title')
    expect(searchCache?.pages[0].results[0].description).toBe('New description')
    expect(searchCache?.pages[0].results[0].snippet).toBe('Snippet')
  })
})
