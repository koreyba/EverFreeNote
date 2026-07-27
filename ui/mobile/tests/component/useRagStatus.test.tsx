import { act, renderHook, waitFor } from '../testUtils'
import { useRagStatus } from '@ui/mobile/hooks/useRagStatus'

jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

type CountResponse = { count: number | null; error: unknown }
type LatestResponse = { data: Array<{ indexed_at: string | null }> | null; error: unknown }
type QueryMode = 'count' | 'latest'

type CountResolver = Promise<CountResponse> | (() => Promise<CountResponse>)
type LatestResolver = Promise<LatestResponse> | (() => Promise<LatestResponse>)

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function createMockClient(
  countResolvers: Record<string, CountResolver>,
  latestResolvers: Record<string, LatestResolver>,
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
          const noteId = state.noteId ?? ''
          const resolver = state.mode === 'count' ? countResolvers[noteId] : latestResolvers[noteId]
          const result =
            (typeof resolver === 'function' ? resolver() : resolver) ??
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

  it('returns { chunkCount: 0, indexedAt: null, isLoading: false } immediately when noteId is undefined or user is null', () => {
    useSupabase.mockReturnValue({
      client: createMockClient({}, {}),
      user: { id: 'test-user-id' },
    })

    const { result: resultUndefined } = renderHook(() => useRagStatus(undefined))
    expect(resultUndefined.current.chunkCount).toBe(0)
    expect(resultUndefined.current.indexedAt).toBeNull()
    expect(resultUndefined.current.isLoading).toBe(false)

    useSupabase.mockReturnValue({
      client: createMockClient({}, {}),
      user: null,
    })

    const { result: resultNoUser } = renderHook(() => useRagStatus('note-1'))
    expect(resultNoUser.current.chunkCount).toBe(0)
    expect(resultNoUser.current.indexedAt).toBeNull()
    expect(resultNoUser.current.isLoading).toBe(false)
  })

  it('handles query errors gracefully (countResult.error or latestResult.error) by setting isLoading: false', async () => {
    useSupabase.mockReturnValue({
      client: createMockClient(
        {
          'note-err-count': Promise.resolve({ count: null, error: new Error('Count error') }),
          'note-err-latest': Promise.resolve({ count: 5, error: null }),
        },
        {
          'note-err-count': Promise.resolve({ data: [], error: null }),
          'note-err-latest': Promise.resolve({ data: null, error: new Error('Latest error') }),
        },
      ),
      user: { id: 'test-user-id' },
    })

    const { result: resultCountErr } = renderHook(() => useRagStatus('note-err-count'))
    await waitFor(() => {
      expect(resultCountErr.current.isLoading).toBe(false)
    })

    const { result: resultLatestErr } = renderHook(() => useRagStatus('note-err-latest'))
    await waitFor(() => {
      expect(resultLatestErr.current.isLoading).toBe(false)
    })
  })

  it('refresh() callback function triggers re-fetch of status', async () => {
    let fetchCount = 0
    useSupabase.mockReturnValue({
      client: createMockClient(
        {
          'note-refresh': () => {
            fetchCount += 1
            return Promise.resolve({ count: fetchCount, error: null })
          },
        },
        {
          'note-refresh': Promise.resolve({
            data: [{ indexed_at: '2026-03-09T18:00:00.000Z' }],
            error: null,
          }),
        },
      ),
      user: { id: 'test-user-id' },
    })

    const { result } = renderHook(() => useRagStatus('note-refresh'))

    await waitFor(() => {
      expect(result.current.chunkCount).toBe(1)
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.chunkCount).toBe(2)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
