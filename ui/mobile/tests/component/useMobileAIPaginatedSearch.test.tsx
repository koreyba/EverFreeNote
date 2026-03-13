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
  content,
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
        preset: 'strict',
        filterTag: null,
        isEnabled: true,
      }),
      { wrapper }
    )

    expect(result.current.noteGroups).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('uses availableChunkCount to keep pagination open when tag filtering trims returned chunks', async () => {
    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: RagSearchPayload }) => {
        if (body.topK === 5) {
          return {
            data: {
              availableChunkCount: 8,
              chunks: [
                createChunk('note-1', 0.91, 0, 0, 'top chunk'),
                createChunk('note-2', 0.84, 0, 50, 'second chunk'),
              ],
            },
            error: null,
          }
        }

        return {
          data: {
            availableChunkCount: 8,
            chunks: [
              createChunk('note-1', 0.91, 0, 0, 'top chunk'),
              createChunk('note-2', 0.84, 0, 50, 'second chunk'),
              createChunk('note-3', 0.8, 0, 90, 'new chunk'),
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
        query: 'ontology',
        preset: 'strict',
        filterTag: 'philosophy',
        isEnabled: true,
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.noteGroups.map((group) => group.noteId)).toEqual(['note-1', 'note-2'])
      expect(result.current.aiHasMore).toBe(true)
    })

    act(() => {
      result.current.loadMoreAI()
    })

    await waitFor(() => {
      expect(result.current.noteGroups.map((group) => group.noteId)).toEqual(['note-1', 'note-2', 'note-3'])
    })

    expect(mockInvoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 5, filterTag: 'philosophy' }),
      })
    )
    expect(mockInvoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ topK: 10, filterTag: 'philosophy' }),
      })
    )
  })

  it('clears accumulated results immediately when the authenticated user changes', async () => {
    let resolveUserB: ((value: { data: { availableChunkCount: number; chunks: ReturnType<typeof createChunk>[] }; error: null }) => void) | null = null

    mockInvoke.mockImplementation(
      (_name: string, { body: _body }: { body: RagSearchPayload }) => {
        if (userId === 'user-a') {
          return Promise.resolve({
            data: {
              availableChunkCount: 1,
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
        preset: 'strict',
        filterTag: null,
        isEnabled: true,
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
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      resolveUserB?.({
        data: {
          availableChunkCount: 1,
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

  it('hides stale groups and errors while the search identity is switching', async () => {
    mockInvoke.mockImplementation(
      (_name: string, { body }: { body: RagSearchPayload }) => {
        if (body.query === 'ontology') {
          return Promise.resolve({
            data: {
              availableChunkCount: 1,
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
        preset: 'strict',
        filterTag: null,
        isEnabled: true,
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
      expect(result.current.error).toBeNull()
    })
  })
})
