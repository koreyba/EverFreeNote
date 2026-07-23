import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, InfiniteData } from '@tanstack/react-query'
import type { Tables } from '@/supabase/types'
import {
  useNotesQuery,
  useFlattenedNotes,
  useSearchNotes,
} from '@ui/web/hooks/useNotesQuery'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

type Note = Tables<'notes'>

const mockNoteService = {
  getNotes: jest.fn(),
}

const mockSearchService = {
  searchNotes: jest.fn(),
}

const mockSupabase = {}

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => mockNoteService),
}))

jest.mock('@core/services/search', () => ({
  SearchService: jest.fn().mockImplementation(() => mockSearchService),
}))

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  user_id: 'user-1',
  title: 'Test Note',
  description: 'Test Description',
  tags: ['work'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useNotesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSupabase).mockReturnValue({
      supabase: mockSupabase as never,
      user: null,
      loading: false,
    })
  })

  it('fetches initial page of notes with default options', async () => {
    const pageData = {
      notes: [makeNote({ id: 'note-1' }), makeNote({ id: 'note-2' })],
      nextCursor: 1,
      totalCount: 2,
      hasMore: true,
    }
    mockNoteService.getNotes.mockResolvedValue(pageData)

    const { result } = renderHook(() => useNotesQuery({ userId: 'user-1' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockNoteService.getNotes).toHaveBeenCalledWith('user-1', {
      page: 0,
      pageSize: 50,
      tag: null,
      searchQuery: '',
    })

    expect(result.current.data?.pages[0]).toEqual(pageData)
  })

  it('passes search query and tag filter options to NoteService', async () => {
    const pageData = {
      notes: [makeNote({ id: 'note-filtered' })],
      nextCursor: undefined,
      totalCount: 1,
      hasMore: false,
    }
    mockNoteService.getNotes.mockResolvedValue(pageData)

    const { result } = renderHook(
      () =>
        useNotesQuery({
          userId: 'user-1',
          searchQuery: 'react',
          selectedTag: 'frontend',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockNoteService.getNotes).toHaveBeenCalledWith('user-1', {
      page: 0,
      pageSize: 50,
      tag: 'frontend',
      searchQuery: 'react',
    })
  })

  it('does not execute query when enabled is false', () => {
    const { result } = renderHook(
      () => useNotesQuery({ userId: 'user-1', enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(mockNoteService.getNotes).not.toHaveBeenCalled()
    expect(result.current.isFetching).toBe(false)
  })

  it('supports infinite pagination via fetchNextPage', async () => {
    const page0 = {
      notes: [makeNote({ id: 'page-0-note' })],
      nextCursor: 1,
      totalCount: 2,
      hasMore: true,
    }
    const page1 = {
      notes: [makeNote({ id: 'page-1-note' })],
      nextCursor: undefined,
      totalCount: 2,
      hasMore: false,
    }

    mockNoteService.getNotes.mockImplementation((_userId, options) => {
      if (options.page === 0) return Promise.resolve(page0)
      if (options.page === 1) return Promise.resolve(page1)
      return Promise.reject(new Error('Invalid page'))
    })

    const { result } = renderHook(() => useNotesQuery({ userId: 'user-1' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))

    expect(mockNoteService.getNotes).toHaveBeenCalledWith('user-1', expect.objectContaining({ page: 1 }))
    expect(result.current.data?.pages[1]).toEqual(page1)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('handles error states when getNotes fails', async () => {
    const error = new Error('Database connection failed')
    mockNoteService.getNotes.mockRejectedValue(error)

    const { result } = renderHook(() => useNotesQuery({ userId: 'user-1' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })

  it('handles empty notes result correctly', async () => {
    const emptyPage = {
      notes: [],
      nextCursor: undefined,
      totalCount: 0,
      hasMore: false,
    }
    mockNoteService.getNotes.mockResolvedValue(emptyPage)

    const { result } = renderHook(() => useNotesQuery({ userId: 'user-1' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pages[0].notes).toEqual([])
    expect(result.current.hasNextPage).toBe(false)
  })

  it('refetches when query parameters change', async () => {
    mockNoteService.getNotes.mockResolvedValue({
      notes: [],
      nextCursor: undefined,
      totalCount: 0,
      hasMore: false,
    })

    const { rerender } = renderHook(
      (props: Parameters<typeof useNotesQuery>[0]) => useNotesQuery(props),
      {
        initialProps: { userId: 'user-1', searchQuery: 'initial', selectedTag: null as string | null },
        wrapper: createWrapper(),
      }
    )

    await waitFor(() =>
      expect(mockNoteService.getNotes).toHaveBeenCalledWith('user-1', expect.objectContaining({ searchQuery: 'initial' }))
    )

    rerender({ userId: 'user-1', searchQuery: 'updated', selectedTag: 'newTag' })

    await waitFor(() =>
      expect(mockNoteService.getNotes).toHaveBeenCalledWith('user-1', expect.objectContaining({ searchQuery: 'updated', tag: 'newTag' }))
    )
  })
})

describe('useFlattenedNotes', () => {
  it('returns empty array when queryResult has no data or empty pages', () => {
    expect(useFlattenedNotes({})).toEqual([])
    expect(useFlattenedNotes({ data: undefined })).toEqual([])
    expect(useFlattenedNotes({ data: { pages: [], pageParams: [] } })).toEqual([])
  })

  it('flattens notes across multiple pages into a single array', () => {
    const note1 = makeNote({ id: '1' })
    const note2 = makeNote({ id: '2' })
    const note3 = makeNote({ id: '3' })

    const queryResult: { data: InfiniteData<{ notes: Note[]; totalCount: number; hasMore: boolean }> } = {
      data: {
        pages: [
          { notes: [note1, note2], totalCount: 3, hasMore: true },
          { notes: [note3], totalCount: 3, hasMore: false },
        ],
        pageParams: [0, 1],
      },
    }

    expect(useFlattenedNotes(queryResult)).toEqual([note1, note2, note3])
  })
})

describe('useSearchNotes', () => {
  const originalLanguage = navigator.language

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSupabase).mockReturnValue({
      supabase: mockSupabase as never,
      user: null,
      loading: false,
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    })
  })

  it('does not execute search if query length is less than MIN_QUERY_LENGTH (3 characters)', () => {
    const { result } = renderHook(() => useSearchNotes('ab', 'user-1'), {
      wrapper: createWrapper(),
    })

    expect(mockSearchService.searchNotes).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not execute search if query is whitespace-only', () => {
    const { result } = renderHook(() => useSearchNotes('   ', 'user-1'), {
      wrapper: createWrapper(),
    })

    expect(mockSearchService.searchNotes).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not execute search if userId is missing', () => {
    const { result } = renderHook(() => useSearchNotes('valid query', undefined), {
      wrapper: createWrapper(),
    })

    expect(mockSearchService.searchNotes).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not execute search when enabled is false', () => {
    const { result } = renderHook(
      () => useSearchNotes('valid query', 'user-1', { enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(mockSearchService.searchNotes).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('executes search with default options when query is valid and debounced', async () => {
    const searchResult = {
      notes: [makeNote({ id: 'search-1' })],
      totalCount: 1,
      hasMore: false,
    }
    mockSearchService.searchNotes.mockResolvedValue(searchResult)

    const { result } = renderHook(() => useSearchNotes('testing', 'user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchService.searchNotes).toHaveBeenCalledWith('user-1', 'testing', {
      language: expect.any(String),
      minRank: 0.01,
      limit: 50,
      offset: 0,
      tag: undefined,
    })

    expect(result.current.data).toEqual({
      ...searchResult,
      query: 'testing',
      executionTime: expect.any(Number),
    })
  })

  it('passes custom search options correctly', async () => {
    const searchResult = { notes: [], totalCount: 0, hasMore: false }
    mockSearchService.searchNotes.mockResolvedValue(searchResult)

    const { result } = renderHook(
      () =>
        useSearchNotes('custom query', 'user-1', {
          language: 'uk',
          minRank: 0.1,
          limit: 20,
          offset: 10,
          selectedTag: 'projects',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchService.searchNotes).toHaveBeenCalledWith('user-1', 'custom query', {
      language: 'uk',
      minRank: 0.1,
      limit: 20,
      offset: 10,
      tag: 'projects',
    })
  })

  it('detects language from browser locale correctly', async () => {
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    })

    mockSearchService.searchNotes.mockResolvedValue({ notes: [], totalCount: 0, hasMore: false })

    const { result } = renderHook(() => useSearchNotes('language test', 'user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchService.searchNotes).toHaveBeenCalledWith(
      'user-1',
      'language test',
      expect.objectContaining({ language: 'en' })
    )
  })

  it('defaults language to ru for unsupported browser locale', async () => {
    Object.defineProperty(navigator, 'language', {
      value: 'fr-FR',
      configurable: true,
    })

    mockSearchService.searchNotes.mockResolvedValue({ notes: [], totalCount: 0, hasMore: false })

    const { result } = renderHook(() => useSearchNotes('locale test', 'user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchService.searchNotes).toHaveBeenCalledWith(
      'user-1',
      'locale test',
      expect.objectContaining({ language: 'ru' })
    )
  })

  it('handles search errors correctly', async () => {
    const searchError = new Error('Search index unavailable')
    mockSearchService.searchNotes.mockRejectedValue(searchError)

    const { result } = renderHook(() => useSearchNotes('error query', 'user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(searchError)
  })
})
