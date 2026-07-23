import { renderHook } from '@testing-library/react'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { useNoteData } from '@ui/web/hooks/useNoteData'
import type { useNotesQuery } from '@ui/web/hooks/useNotesQuery'
import type { useNoteSearch } from '@ui/web/hooks/useNoteSearch'

type AggregatedFtsData = NonNullable<ReturnType<typeof useNoteSearch>['aggregatedFtsData']>

const makeNote = (id: string, overrides: Partial<NoteViewModel> = {}): NoteViewModel => ({
  id,
  title: `Title ${id}`,
  description: `Desc ${id}`,
  tags: ['tag1'],
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeCachedNote = (id: string, overrides: Partial<CachedNote> = {}): CachedNote => ({
  id,
  title: `Cached Title ${id}`,
  description: `Cached Desc ${id}`,
  tags: ['cached'],
  status: 'pending',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
})

const createMockNotesQuery = (
  notes: NoteViewModel[] = [],
  totalCount?: number
) => {
  return {
    data: notes.length || totalCount !== undefined
      ? {
          pages: [
            {
              notes,
              totalCount: totalCount ?? notes.length,
              hasMore: false,
              nextCursor: undefined,
            },
          ],
          pageParams: [0],
        }
      : undefined,
    isSuccess: true,
    isError: false,
    isLoading: false,
  } as unknown as ReturnType<typeof useNotesQuery>
}

describe('useNoteData', () => {
  it('computes base note list, notesById map, and counts correctly when no overlay is present', () => {
    const note1 = makeNote('1')
    const note2 = makeNote('2')
    const notesQuery = createMockNotesQuery([note1, note2], 100)
    const selectedNoteIds = new Set(['1'])

    const { result } = renderHook(() =>
      useNoteData({
        notesQuery,
        offlineOverlay: [],
        aggregatedFtsData: undefined,
        selectedNoteIds,
      })
    )

    expect(result.current.notes).toEqual([note1, note2])
    expect(result.current.notesById.get('1')).toEqual(note1)
    expect(result.current.notesById.get('2')).toEqual(note2)
    expect(result.current.notesById.size).toBe(2)
    expect(result.current.totalNotes).toBe(100)
    expect(result.current.notesDisplayed).toBe(2)
    expect(result.current.notesTotal).toBe(100)
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.mergedFtsData).toBeUndefined()
  })

  it('applies offline overlay (modifications, additions, and deletions)', () => {
    const note1 = makeNote('1', { title: 'Server Title 1' })
    const note2 = makeNote('2', { title: 'Server Title 2' })
    const notesQuery = createMockNotesQuery([note1, note2])

    const offlineOverlay: CachedNote[] = [
      makeCachedNote('1', { title: 'Overlay Title 1', updatedAt: '2026-01-05T00:00:00Z' }),
      makeCachedNote('3', { title: 'New Offline Note', updatedAt: '2026-01-06T00:00:00Z' }),
      makeCachedNote('2', { deleted: true }),
    ]

    const { result } = renderHook(() =>
      useNoteData({
        notesQuery,
        offlineOverlay,
        aggregatedFtsData: undefined,
        selectedNoteIds: new Set(),
      })
    )

    // note2 should be excluded (deleted), note1 modified, note3 added
    expect(result.current.notesById.has('2')).toBe(false)
    expect(result.current.notesById.get('1')?.title).toBe('Overlay Title 1')
    expect(result.current.notesById.get('3')?.title).toBe('New Offline Note')
    expect(result.current.notesDisplayed).toBe(2)
  })

  it('falls back to notes.length for totalNotes when totalCount is missing or pages are empty', () => {
    const note1 = makeNote('1')
    const queryWithoutTotalCount = {
      data: {
        pages: [{ notes: [note1], totalCount: undefined as unknown as number, hasMore: false }],
        pageParams: [0],
      },
    } as unknown as ReturnType<typeof useNotesQuery>

    const { result: result1 } = renderHook(() =>
      useNoteData({
        notesQuery: queryWithoutTotalCount,
        offlineOverlay: [],
        aggregatedFtsData: undefined,
        selectedNoteIds: new Set(),
      })
    )

    expect(result1.current.totalNotes).toBe(1)
    expect(result1.current.notesTotal).toBe(1)

    const emptyQuery = createMockNotesQuery([])
    const { result: result2 } = renderHook(() =>
      useNoteData({
        notesQuery: emptyQuery,
        offlineOverlay: [],
        aggregatedFtsData: undefined,
        selectedNoteIds: new Set(),
      })
    )

    expect(result2.current.totalNotes).toBe(0)
    expect(result2.current.notesTotal).toBe(0)
  })

  it('resolves search results by merging latest fields from notesById', () => {
    const note1 = makeNote('1', { title: 'Updated Title', updated_at: '2026-01-10T00:00:00Z' })
    const notesQuery = createMockNotesQuery([note1])

    const { result } = renderHook(() =>
      useNoteData({
        notesQuery,
        offlineOverlay: [],
        aggregatedFtsData: undefined,
        selectedNoteIds: new Set(),
      })
    )

    const searchResult1: SearchResult = {
      id: '1',
      title: 'Old Title',
      description: 'Search Desc',
      tags: ['tag1'],
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      headline: '<b>Old Title</b>',
      rank: 0.8,
    }

    const resolved = result.current.resolveSearchResult(searchResult1)
    expect(resolved.title).toBe('Updated Title')
    expect(resolved.updated_at).toBe('2026-01-10T00:00:00Z')

    // Searching for non-existent note returns searchResult unchanged
    const unknownSearchResult: SearchResult = {
      id: '99',
      title: 'Unknown',
      description: 'Unknown Desc',
      tags: [],
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rank: 0,
      headline: null,
    }

    const resolvedUnknown = result.current.resolveSearchResult(unknownSearchResult)
    expect(resolvedUnknown).toEqual(unknownSearchResult)
  })

  it('merges aggregated FTS search results correctly', () => {
    const note1 = makeNote('1', { title: 'Fresh Title', updated_at: '2026-01-10T00:00:00Z' })
    const notesQuery = createMockNotesQuery([note1])

    const ftsData: AggregatedFtsData = {
      results: [
        {
          id: '1',
          title: 'Stale Title',
          description: 'Desc',
          tags: ['fts'],
          user_id: 'user-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          rank: 0.95,
          headline: null,
        },
      ],
      total: 1,
      method: 'fts',
      executionTime: 12,
      query: 'test',
    }

    const { result, rerender } = renderHook(
      (props) => useNoteData(props),
      {
        initialProps: {
          notesQuery,
          offlineOverlay: [],
          aggregatedFtsData: ftsData,
          selectedNoteIds: new Set<string>(),
        },
      }
    )

    expect(result.current.mergedFtsData?.results[0].title).toBe('Fresh Title')

    // Test with empty aggregated FTS results
    const emptyFtsData: AggregatedFtsData = {
      results: [],
      total: 0,
      method: 'fts',
      executionTime: 0,
      query: '',
    }

    rerender({
      notesQuery,
      offlineOverlay: [],
      aggregatedFtsData: emptyFtsData,
      selectedNoteIds: new Set<string>(),
    })

    expect(result.current.mergedFtsData).toBe(emptyFtsData)
  })

  it('maintains notesRef in sync with notes state across rerenders', () => {
    const note1 = makeNote('1')
    const initialQuery = createMockNotesQuery([note1])

    const { result, rerender } = renderHook(
      (props) => useNoteData(props),
      {
        initialProps: {
          notesQuery: initialQuery,
          offlineOverlay: [],
          aggregatedFtsData: undefined,
          selectedNoteIds: new Set<string>(),
        },
      }
    )

    expect(result.current.notesRef.current).toEqual([note1])

    const note2 = makeNote('2')
    const updatedQuery = createMockNotesQuery([note1, note2])

    rerender({
      notesQuery: updatedQuery,
      offlineOverlay: [],
      aggregatedFtsData: undefined,
      selectedNoteIds: new Set<string>(),
    })

    expect(result.current.notesRef.current).toEqual([note1, note2])
  })
})
