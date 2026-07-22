import { act, renderHook, waitFor } from '@testing-library/react'
import type { SearchResult } from '@core/types/domain'
import { useNoteSearch } from '@ui/web/hooks/useNoteSearch'
import * as notesQuery from '@ui/web/hooks/useNotesQuery'

jest.mock('@ui/web/hooks/useNotesQuery', () => ({
  useFlattenedNotes: jest.fn(),
  useNotesQuery: jest.fn(),
  useSearchNotes: jest.fn(),
}))

jest.mock('@ui/web/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: jest.fn(() => ({ current: null })),
}))

const mockUseFlattenedNotes = notesQuery.useFlattenedNotes as jest.Mock
const mockUseNotesQuery = notesQuery.useNotesQuery as jest.Mock
const mockUseSearchNotes = notesQuery.useSearchNotes as jest.Mock

const searchResult = (id: string): SearchResult => ({
  id,
  title: `Result ${id}`,
  description: 'Description',
  tags: ['work'],
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  rank: 0.9,
  headline: `Headline ${id}`,
})

const tagNote = (id: string) => ({
  ...searchResult(id),
  rank: undefined,
  headline: undefined,
})

const emptyFtsResult = { data: undefined, isFetching: false }

describe('useNoteSearch', () => {
  beforeEach(() => {
    mockUseSearchNotes.mockReturnValue(emptyFtsResult)
    mockUseNotesQuery.mockReturnValue({
      data: undefined,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      isLoading: false,
    })
    mockUseFlattenedNotes.mockReturnValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('trims searches, enables FTS only for an authenticated valid query, and accumulates pages', async () => {
    const firstPage = [searchResult('one'), searchResult('two')]
    const secondPage = [searchResult('two'), searchResult('three')]
    mockUseSearchNotes.mockImplementation((query: string, _userId: string | undefined, options: { offset: number }) => {
      if (query !== 'abc') return emptyFtsResult
      return {
        data: {
          results: options.offset === 0 ? firstPage : secondPage,
          total: 3,
          method: 'fts',
          query,
          executionTime: 1,
        },
        isFetching: false,
      }
    })
    const { result } = renderHook(() => useNoteSearch('user-1'))

    act(() => result.current.handleSearch('  abc  '))
    await waitFor(() => expect(result.current.ftsAccumulatedResults).toHaveLength(2))
    expect(result.current.searchQuery).toBe('abc')
    expect(result.current.isSearchPanelOpen).toBe(true)
    expect(result.current.showFTSResults).toBe(true)
    expect(result.current.ftsHasMore).toBe(true)

    act(() => result.current.loadMoreFts())
    await waitFor(() => expect(result.current.ftsAccumulatedResults.map((item) => item.id)).toEqual(['one', 'two', 'three']))
    expect(result.current.ftsHasMore).toBe(false)
    expect(result.current.aggregatedFtsData?.total).toBe(3)

    expect(mockUseSearchNotes).toHaveBeenCalledWith('abc', 'user-1', expect.objectContaining({
      enabled: true,
      offset: 0,
      limit: 50,
    }))
    expect(mockUseSearchNotes).toHaveBeenCalledWith('abc', 'user-1', expect.objectContaining({ offset: 50 }))
  })

  it('keeps short and unauthenticated searches disabled and does not show FTS results', () => {
    const { result, rerender } = renderHook(({ userId }: { userId: string | undefined }) => useNoteSearch(userId), {
      initialProps: { userId: undefined },
    })

    act(() => result.current.handleSearch('ab'))
    expect(result.current.searchQuery).toBe('ab')
    expect(result.current.isSearchPanelOpen).toBe(true)
    expect(result.current.showFTSResults).toBe(false)
    expect(mockUseSearchNotes).toHaveBeenLastCalledWith('ab', undefined, expect.objectContaining({ enabled: false }))

    rerender({ userId: 'user-1' })
    expect(mockUseSearchNotes).toHaveBeenLastCalledWith('ab', 'user-1', expect.objectContaining({ enabled: false }))
  })

  it('supports tag-only mode, pagination, and clearing the tag filter', async () => {
    const fetchNextPage = jest.fn().mockResolvedValue(undefined)
    const tagQuery = {
      data: { pages: [{ notes: [tagNote('one')], totalCount: 4 }] },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
      isLoading: false,
    }
    mockUseNotesQuery.mockImplementation(({ selectedTag }: { selectedTag: string | null }) =>
      selectedTag ? tagQuery : { ...tagQuery, data: undefined, hasNextPage: false },
    )
    mockUseFlattenedNotes.mockImplementation((query: typeof tagQuery) => query === tagQuery ? [tagNote('one')] : [])
    const { result } = renderHook(() => useNoteSearch('user-1'))

    act(() => result.current.handleTagClick('work'))
    await waitFor(() => expect(result.current.showTagOnlyResults).toBe(true))
    expect(result.current.filterByTag).toBe('work')
    expect(result.current.tagOnlyResults.map((item) => item.id)).toEqual(['one'])
    expect(result.current.tagOnlyTotal).toBe(4)
    expect(result.current.tagOnlyHasMore).toBe(true)

    act(() => result.current.loadMoreTagOnly())
    expect(fetchNextPage).toHaveBeenCalledTimes(1)

    act(() => result.current.handleTagClick('work'))
    expect(mockUseNotesQuery).toHaveBeenCalledTimes(2)

    act(() => result.current.handleClearTagFilter())
    expect(result.current.filterByTag).toBeNull()
    expect(result.current.showTagOnlyResults).toBe(false)
    expect(result.current.ftsAccumulatedResults).toEqual([])
  })

  it('hides errored FTS data and resetFtsResults clears accumulated results', async () => {
    const erroredData = {
      results: [searchResult('failed')],
      total: 1,
      method: 'fts' as const,
      error: 'search failed',
      query: 'err',
      executionTime: 1,
    }
    mockUseSearchNotes.mockImplementation((query: string) => query === 'err'
      ? { data: erroredData, isFetching: false }
      : emptyFtsResult)
    const { result } = renderHook(() => useNoteSearch('user-1'))

    act(() => result.current.handleSearch('err'))
    await waitFor(() => expect(result.current.ftsAccumulatedResults).toHaveLength(1))
    expect(result.current.showFTSResults).toBe(false)
    expect(result.current.aggregatedFtsData).toBeUndefined()
    expect(result.current.ftsHasMore).toBe(false)

    act(() => result.current.resetFtsResults())
    expect(result.current.ftsAccumulatedResults).toEqual([])
    expect(result.current.ftsSearchResult.data).toBe(erroredData)
  })

  it('does not load tag-only pages while already fetching or when there is no next page', () => {
    const fetchNextPage = jest.fn()
    mockUseNotesQuery.mockReturnValue({
      data: { pages: [{ notes: [], totalCount: 0 }] },
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage,
      isLoading: false,
    })
    const { result } = renderHook(() => useNoteSearch('user-1'))

    act(() => result.current.handleTagClick('work'))
    act(() => result.current.loadMoreTagOnly())
    expect(fetchNextPage).not.toHaveBeenCalled()
  })
})
