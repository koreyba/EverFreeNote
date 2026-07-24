import type { QueryClient } from '@tanstack/react-query'
import { createQueryWrapper, createTestQueryClient, renderHook, waitFor } from '../testUtils'
import {
  getAIIndexNotesQueryKey,
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from '@ui/mobile/hooks/useAIIndexNotes'

const mockRpc = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: { rpc: mockRpc },
    user: { id: 'test-user-id' },
  })),
}))

const { useSupabase } = require('@ui/mobile/providers') as {
  useSupabase: jest.Mock
}

function makeRpcRows(
  rows: Array<{ id: string; title: string; status: string }>,
  totalCount?: number | string | null
) {
  return rows.map((r, i) => ({
    id: r.id,
    title: r.title,
    updated_at: '2025-06-01T00:00:00Z',
    last_indexed_at: r.status === 'indexed' ? '2025-06-01T00:00:00Z' : null,
    status: r.status,
    total_count: i === 0 ? (totalCount ?? rows.length) : null,
  }))
}

describe('getAIIndexNotesQueryKey & getAIIndexNotesQueryPrefix', () => {
  it('returns correctly formatted query key', () => {
    expect(getAIIndexNotesQueryKey('user-123', 'all', '  search  ')).toEqual([
      'ai-index-notes',
      'user-123',
      'all',
      'search',
    ])
    expect(getAIIndexNotesQueryKey(undefined, 'indexed', '')).toEqual([
      'ai-index-notes',
      null,
      'indexed',
      '',
    ])
  })

  it('returns correctly formatted query prefix', () => {
    expect(getAIIndexNotesQueryPrefix('user-123')).toEqual(['ai-index-notes', 'user-123'])
    expect(getAIIndexNotesQueryPrefix()).toEqual(['ai-index-notes', null])
  })
})

describe('useAIIndexNotes', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
    mockRpc.mockResolvedValue({
      data: makeRpcRows([
        { id: 'n1', title: 'Note 1', status: 'indexed' },
        { id: 'n2', title: 'Note 2', status: 'not_indexed' },
      ]),
      error: null,
    })
  })

  afterEach(() => queryClient.clear())

  it('returns mapped notes on success', async () => {
    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const pages = result.current.data?.pages
    expect(pages).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by assertion above
    const page = pages![0]
    expect(page.notes).toHaveLength(2)
    expect(page.notes[0]).toMatchObject({ id: 'n1', title: 'Note 1', status: 'indexed' })
    expect(page.notes[1]).toMatchObject({ id: 'n2', title: 'Note 2', status: 'not_indexed' })
    expect(page.totalCount).toBe(2)
  })

  it('passes filter to RPC', async () => {
    const { result } = renderHook(() => useAIIndexNotes('outdated', ''), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith(
      'get_ai_index_notes',
      expect.objectContaining({ filter_status: 'outdated' })
    )
  })

  it('does not fetch when no user', async () => {
    useSupabase.mockReturnValue({
      client: { rpc: mockRpc },
      user: null,
    })

    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    // Should stay in idle/disabled state
    expect(result.current.isFetching).toBe(false)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('handles RPC error', async () => {
    // Re-establish user mock (previous test may have cleared it)
    useSupabase.mockReturnValue({
      client: { rpc: mockRpc },
      user: { id: 'test-user-id' },
    })
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Message: Database error')
  })

  it('formats PGRST202 RPC error with custom message', async () => {
    useSupabase.mockReturnValue({
      client: { rpc: mockRpc },
      user: { id: 'test-user-id' },
    })
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find function get_ai_index_notes in schema',
        details: 'Function signature mismatch',
        hint: 'Apply migration',
      },
    })

    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('AI Index database function is out of date.')
    expect(result.current.error?.message).toContain('Code: PGRST202')
  })

  it('parses string total_count in RPC response rows', async () => {
    useSupabase.mockReturnValue({
      client: { rpc: mockRpc },
      user: { id: 'test-user-id' },
    })
    mockRpc.mockResolvedValue({
      data: makeRpcRows([{ id: 'n1', title: 'Note 1', status: 'indexed' }], '42'),
      error: null,
    })

    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0].totalCount).toBe(42)
  })

  it('defaults total_count to 0 for invalid or missing total_count string/null', async () => {
    useSupabase.mockReturnValue({
      client: { rpc: mockRpc },
      user: { id: 'test-user-id' },
    })
    mockRpc.mockResolvedValue({
      data: makeRpcRows([{ id: 'n1', title: 'Note 1', status: 'indexed' }], 'invalid_num'),
      error: null,
    })

    const { result } = renderHook(() => useAIIndexNotes('all', ''), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0].totalCount).toBe(0)
  })
})

describe('useFlattenedAIIndexNotes', () => {
  it('flattens multi-page data', () => {
    const mockQueryResult = {
      data: {
        pages: [
          { notes: [{ id: 'a' }, { id: 'b' }], totalCount: 4, hasMore: true },
          { notes: [{ id: 'c' }, { id: 'd' }], totalCount: 4, hasMore: false },
        ],
        pageParams: [0, 1],
      },
    }

    const { result } = renderHook(() => useFlattenedAIIndexNotes(mockQueryResult as never))
    expect(result.current).toHaveLength(4)
    expect(result.current.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns empty array when no data or data is undefined', () => {
    const { result: res1 } = renderHook(() => useFlattenedAIIndexNotes({}))
    expect(res1.current).toEqual([])

    const { result: res2 } = renderHook(() => useFlattenedAIIndexNotes({ data: undefined }))
    expect(res2.current).toEqual([])
  })
})
