import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { useRagStatus } from '@ui/web/hooks/useRagStatus'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

const user = { id: 'user-1' } as User

const createWrapper = (supabase: SupabaseClient, currentUser: User | null = user) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SupabaseTestProvider supabase={supabase} user={currentUser}>{children}</SupabaseTestProvider>
  }

const createSupabase = (responses: Array<{ data: unknown[] | null; error: Error | null }>) => {
  const secondEq = jest.fn().mockImplementation(() => Promise.resolve(responses.shift() ?? { data: [], error: null }))
  const firstEq = jest.fn().mockReturnValue({ eq: secondEq })
  const select = jest.fn().mockReturnValue({ eq: firstEq })
  const from = jest.fn().mockReturnValue({ select })
  return { supabase: { from } as unknown as SupabaseClient, from, select, firstEq, secondEq }
}

describe('useRagStatus', () => {
  it('returns the disabled state without querying when note or user is absent', () => {
    const { supabase, from } = createSupabase([])
    const { result } = renderHook(() => useRagStatus(undefined), {
      wrapper: createWrapper(supabase, null),
    })

    expect(result.current).toMatchObject({ chunkCount: 0, indexedAt: null, isLoading: false })
    act(() => result.current.refresh())
    expect(from).not.toHaveBeenCalled()
  })

  it('loads count and chooses the latest valid indexed timestamp', async () => {
    const { supabase, from } = createSupabase([
      {
        data: [
          { indexed_at: '2026-01-02T00:00:00Z' },
          { indexed_at: null },
          { indexed_at: 'not-a-date' },
          { indexed_at: '2026-01-04T00:00:00Z' },
        ],
        error: null,
      },
    ])
    const { result } = renderHook(() => useRagStatus('note-1'), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.chunkCount).toBe(4)
    expect(result.current.indexedAt).toBe('2026-01-04T00:00:00Z')
    expect(from).toHaveBeenCalledWith('note_embeddings')
    expect(result.current.refresh).toEqual(expect.any(Function))
  })

  it('clears loading on a service error and leaves the count at zero', async () => {
    const { supabase, secondEq } = createSupabase([
      { data: null, error: new Error('permission denied') },
    ])
    const { result } = renderHook(() => useRagStatus('note-1'), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.chunkCount).toBe(0)
    expect(result.current.indexedAt).toBeNull()
    expect(secondEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('refreshes immediately and polls, then stops polling after unmount', async () => {
    jest.useFakeTimers()
    try {
      const { supabase, from } = createSupabase([
        { data: [], error: null },
        { data: [{ indexed_at: '2026-02-01T00:00:00Z' }], error: null },
        { data: [{ indexed_at: '2026-02-02T00:00:00Z' }], error: null },
      ])
      const { result, unmount } = renderHook(() => useRagStatus('note-1'), {
        wrapper: createWrapper(supabase),
      })

      await act(async () => {
        await Promise.resolve()
      })
      expect(from).toHaveBeenCalledTimes(1)

      act(() => result.current.refresh())
      await act(async () => {
        await Promise.resolve()
      })
      expect(from).toHaveBeenCalledTimes(2)
      expect(result.current.indexedAt).toBe('2026-02-01T00:00:00Z')

      await act(async () => {
        jest.advanceTimersByTime(3000)
        await Promise.resolve()
      })
      expect(from).toHaveBeenCalledTimes(3)
      expect(result.current.indexedAt).toBe('2026-02-02T00:00:00Z')

      unmount()
      jest.advanceTimersByTime(3000)
      expect(from).toHaveBeenCalledTimes(3)
    } finally {
      jest.useRealTimers()
    }
  })

  it('ignores a response from a note whose effect was already cancelled', async () => {
    let resolveFirst: ((value: { data: unknown[]; error: null }) => void) | undefined
    const firstResponse = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      resolveFirst = resolve
    })
    const secondEq = jest.fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({ data: [{ indexed_at: '2026-03-02T00:00:00Z' }], error: null })
    const firstEq = jest.fn().mockReturnValue({ eq: secondEq })
    const from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: firstEq }) })
    const supabase = { from } as unknown as SupabaseClient
    const { result, rerender } = renderHook(({ noteId }: { noteId: string }) => useRagStatus(noteId), {
      initialProps: { noteId: 'note-old' },
      wrapper: createWrapper(supabase),
    })

    rerender({ noteId: 'note-new' })
    await act(async () => {
      resolveFirst?.({ data: [{ indexed_at: '2026-03-01T00:00:00Z' }], error: null })
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.indexedAt).toBe('2026-03-02T00:00:00Z'))
    expect(result.current.chunkCount).toBe(1)
  })
})
