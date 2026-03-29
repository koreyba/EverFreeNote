import { act, renderHook, waitFor, createQueryWrapper, createTestQueryClient } from '../testUtils'
import { useMobileAIPaginatedSearch } from '@ui/mobile/hooks/useMobileAIPaginatedSearch'

const mockInvoke = jest.fn()
const mockUseSupabase = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: () => mockUseSupabase(),
}))

type RagSearchPayload = {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
}

const createChunk = (
  noteId: string,
  similarity: number,
  chunkIndex: number,
  charOffset: number,
  content: string
) => ({
  noteId,
  noteTitle: `Title ${noteId}`,
  noteTags: ['tag'],
  chunkIndex,
  charOffset,
  bodyContent: content,
  overlapPrefix: '',
  content: `Section: ${noteId}\n\n${content}\n\nTags: tag`,
  similarity,
})

describe('useMobileAIPaginatedSearch', () => {
  let userId = 'user-a'

  beforeEach(() => {
    jest.clearAllMocks()
    userId = 'user-a'
    mockUseSupabase.mockImplementation(() => ({
      client: {
        functions: {
          invoke: mockInvoke,
        },
      },
      user: { id: userId },
    }))
  })

  it('does not invoke rag-search for queries shorter than the minimum length', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result } = renderHook(
      () => useMobileAIPaginatedSearch({
        query: 'hi',
        topK: 15,
        threshold: 0.55,
        filterTag: null,
        isEnabled: true,
        resultMode: 'note',
      }),
      { wrapper }
    )

    expect(result.current.noteGroups).toEqual([])
    expect(result.current.chunks).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('uses backend hasMore for chunk pagination and exposes raw chunks', async () => {
    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: RagSearchPayload }) => ({
        data: {
          hasMore: body.topK < 10,
          chunks: body.topK < 10
            ? [
              createChunk('note-1', 0.91, 0, 0, 'top chunk'),
              createChunk('note-1', 0.87, 1, 80, 'second chunk'),
              createChunk('note-2', 0.82, 0, 0, 'third chunk'),
            ]
            : [
              createChunk('note-1', 0.91, 0, 0, 'top chunk'),
              createChunk('note-1', 0.87, 1, 80, 'second chunk'),
              createChunk('note-2', 0.82, 0, 0, 'third chunk'),
              createChunk('note-3', 0.8, 0, 0, 'new chunk'),
            ],
        },
        error: null,
      })
    )

    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result } = renderHook(
      () => useMobileAIPaginatedSearch({
        query: 'ontology',
        topK: 5,
        threshold: 0.4,
        filterTag: 'philosophy',
        isEnabled: true,
        resultMode: 'chunk',
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.chunks).toHaveLength(3)
      expect(result.current.noteGroups.map((group) => group.noteId)).toEqual(['note-1', 'note-2'])
      expect(result.current.aiHasMore).toBe(true)
    })

    act(() => {
      result.current.loadMoreAI()
    })

    await waitFor(() => {
      expect(result.current.chunks).toHaveLength(4)
      expect(result.current.chunks[3]?.noteId).toBe('note-3')
      expect(result.current.aiHasMore).toBe(false)
    })

    expect(mockInvoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 5, threshold: 0.4, filterTag: 'philosophy' }),
      })
    )
    expect(mockInvoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 10, threshold: 0.4, filterTag: 'philosophy' }),
      })
    )
  })

  it('keeps fetching more chunks in note mode until enough unique notes are available', async () => {
    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: RagSearchPayload }) => {
        if (body.topK === 15) {
          return {
            data: {
              hasMore: true,
              chunks: Array.from({ length: 15 }, (_, index) => (
                createChunk('note-1', 0.95 - index * 0.01, index, index * 320, `note 1 chunk ${index}`)
              )),
            },
            error: null,
          }
        }

        return {
          data: {
            hasMore: false,
            chunks: [
              ...Array.from({ length: 15 }, (_, index) => (
                createChunk('note-1', 0.95 - index * 0.01, index, index * 320, `note 1 chunk ${index}`)
              )),
              createChunk('note-2', 0.79, 0, 0, 'note 2 chunk'),
            ],
          },
          error: null,
        }
      }
    )

    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result } = renderHook(
      () => useMobileAIPaginatedSearch({
        query: 'quadrants',
        topK: 15,
        threshold: 0.25,
        filterTag: null,
        isEnabled: true,
        resultMode: 'note',
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.noteGroups.map((group) => group.noteId)).toEqual(['note-1', 'note-2'])
      expect(result.current.chunks).toHaveLength(16)
      expect(result.current.aiHasMore).toBe(false)
    })

    expect(mockInvoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 15, threshold: 0.25 }),
      })
    )
    expect(mockInvoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 30, threshold: 0.25 }),
      })
    )
  })

  it('clears accumulated results immediately when the authenticated user changes', async () => {
    let resolveUserB: ((value: { data: { hasMore: boolean; chunks: ReturnType<typeof createChunk>[] }; error: null }) => void) | null = null

    mockInvoke.mockImplementation(
      (_name: string, { body: _body }: { body: RagSearchPayload }) => {
        if (userId === 'user-a') {
          return Promise.resolve({
            data: {
              hasMore: false,
              chunks: [createChunk('note-user-a', 0.95, 0, 0, 'user a chunk')],
            },
            error: null,
          })
        }

        return new Promise((resolve) => {
          resolveUserB = resolve
        })
      }
    )

    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useMobileAIPaginatedSearch({
        query,
        topK: 15,
        threshold: 0.55,
        filterTag: null,
        isEnabled: true,
        resultMode: 'note',
      }),
      {
        initialProps: { query: 'ontology' },
        wrapper,
      }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.noteId).toBe('note-user-a')
    })

    userId = 'user-b'
    rerender({ query: 'ontology' })

    await waitFor(() => {
      expect(result.current.noteGroups).toEqual([])
      expect(result.current.chunks).toEqual([])
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      resolveUserB?.({
        data: {
          hasMore: false,
          chunks: [createChunk('note-user-b', 0.88, 0, 12, 'user b chunk')],
        },
        error: null,
      })
    })

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.noteId).toBe('note-user-b')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('hides stale results and errors while the search identity is switching', async () => {
    mockInvoke.mockImplementation(
      (_name: string, { body }: { body: RagSearchPayload }) => {
        if (body.query === 'ontology') {
          return Promise.resolve({
            data: {
              hasMore: false,
              chunks: [createChunk('note-a', 0.95, 0, 0, 'stable result')],
            },
            error: null,
          })
        }

        return new Promise(() => {
          // Keep the next identity unresolved so we can assert the transition state.
        })
      }
    )

    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useMobileAIPaginatedSearch({
        query,
        topK: 15,
        threshold: 0.55,
        filterTag: null,
        isEnabled: true,
        resultMode: 'note',
      }),
      {
        initialProps: { query: 'ontology' },
        wrapper,
      }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.noteId).toBe('note-a')
    })

    rerender({ query: 'metaphysics' })

    await waitFor(() => {
      expect(result.current.noteGroups).toEqual([])
      expect(result.current.chunks).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })
})
