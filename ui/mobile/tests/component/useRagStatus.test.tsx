import { act, renderHook, waitFor } from '../testUtils'
import { useRagStatus } from '@ui/mobile/hooks/useRagStatus'

jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

type CountResponse = { count: number | null; error: null }
type LatestResponse = { data: Array<{ indexed_at: string | null }>; error: null }
type QueryMode = 'count' | 'latest'

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function createMockClient(
  countResolvers: Record<string, Promise<CountResponse>>,
  latestResolvers: Record<string, Promise<LatestResponse>>,
) {
  return {
    from: jest.fn(() => {
      const state: { mode: QueryMode; noteId: string | null } = {
        mode: 'latest',
        noteId: null,
      }

      const builder = {
        select: (_columns: string, options?: { head?: boolean }) => {
          state.mode = options?.head ? 'count' : 'latest'
          return builder
        },
        eq: (field: string, value: string) => {
          if (field === 'note_id') {
            state.noteId = value
          }
          return builder
        },
        order: () => builder,
        limit: () => builder,
        then: (onFulfilled: (value: CountResponse | LatestResponse) => unknown, onRejected?: (reason: unknown) => unknown) => {
          const noteId = state.noteId
          const result =
            (state.mode === 'count' ? countResolvers[noteId] : latestResolvers[noteId]) ??
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          Promise.reject(new Error(`No resolver for noteId: ${noteId || '<missing>'}`))
          return result.then(onFulfilled, onRejected)
        },
      }

      return builder
    }),
  }
}

describe('hooks/useRagStatus', () => {
  const { useSupabase } = jest.requireMock('@ui/mobile/providers/SupabaseProvider')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resets to a loading state when noteId changes before the next fetch resolves', async () => {
    const noteBCount = createDeferred<CountResponse>()
    const noteBLatest = createDeferred<LatestResponse>()

    useSupabase.mockReturnValue({
      client: createMockClient(
        {
          'note-a': Promise.resolve({ count: 2, error: null }),
          'note-b': noteBCount.promise,
        },
        {
          'note-a': Promise.resolve({
            data: [{ indexed_at: '2026-03-09T18:00:00.000Z' }],
            error: null,
          }),
          'note-b': noteBLatest.promise,
        },
      ),
      user: { id: 'test-user-id' },
    })

    const { result, rerender } = renderHook(
      ({ noteId }: { noteId: string }) => useRagStatus(noteId),
      { initialProps: { noteId: 'note-a' } },
    )

    await waitFor(() => {
      expect(result.current.chunkCount).toBe(2)
      expect(result.current.indexedAt).toBe('2026-03-09T18:00:00.000Z')
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      rerender({ noteId: 'note-b' })
    })

    await waitFor(() => {
      expect(result.current.chunkCount).toBe(0)
      expect(result.current.indexedAt).toBeNull()
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      noteBCount.resolve({ count: 0, error: null })
      noteBLatest.resolve({ data: [], error: null })
    })

    await waitFor(() => {
      expect(result.current.chunkCount).toBe(0)
      expect(result.current.indexedAt).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })
})
