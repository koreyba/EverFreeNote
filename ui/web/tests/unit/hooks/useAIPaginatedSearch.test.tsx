import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SearchPreset } from '@core/constants/aiSearch'
import type { RagChunk } from '@core/types/ragSearch'
import { useAIPaginatedSearch } from '@ui/web/hooks/useAIPaginatedSearch'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

type HookProps = {
  query: string
  preset: SearchPreset
  filterTag: string | null
  isEnabled: boolean
}

const createChunk = (
  noteId: string,
  similarity: number,
  chunkIndex: number,
  charOffset: number,
  content: string
): RagChunk => ({
  noteId,
  noteTitle: `Title ${noteId}`,
  noteTags: ['tag'],
  chunkIndex,
  charOffset,
  bodyContent: content,
  overlapPrefix: '',
  content,
  similarity,
})

const createWrapper = (supabase: SupabaseClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SupabaseTestProvider supabase={supabase}>{children}</SupabaseTestProvider>
  }

describe('useAIPaginatedSearch', () => {
  it('does not request AI search for queries shorter than the minimum length', () => {
    const invoke = jest.fn()
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result } = renderHook(
      () =>
        useAIPaginatedSearch({
          query: 'hi',
          preset: 'strict',
          filterTag: null,
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    expect(result.current.noteGroups).toEqual([])
    expect(invoke).not.toHaveBeenCalled()
  })

  it('refreshes existing groups when cumulative load-more returns improved chunks', async () => {
    const invoke = jest.fn().mockImplementation(
      async (_fn: string, { body }: { body: { topK: number; query: string; filterTag: string | null } }) => {
        if (body.topK === 5) {
          return {
            data: {
              chunks: [
                createChunk('note-1', 0.7, 0, 0, 'first snippet'),
                createChunk('note-1', 0.69, 1, 700, 'second snippet'),
                createChunk('note-2', 0.66, 0, 0, 'other snippet'),
                createChunk('note-3', 0.64, 0, 0, 'third snippet'),
                createChunk('note-4', 0.63, 0, 0, 'fourth snippet'),
              ],
            },
            error: null,
          }
        }

        return {
          data: {
            chunks: [
              createChunk('note-1', 0.92, 0, 0, 'updated best snippet'),
              createChunk('note-5', 0.85, 0, 0, 'new note snippet'),
              createChunk('note-2', 0.66, 0, 0, 'other snippet'),
              createChunk('note-3', 0.64, 0, 0, 'third snippet'),
              createChunk('note-4', 0.63, 0, 0, 'fourth snippet'),
              createChunk('note-6', 0.62, 0, 0, 'fifth snippet'),
              createChunk('note-7', 0.61, 0, 0, 'sixth snippet'),
              createChunk('note-8', 0.6, 0, 0, 'seventh snippet'),
            ],
          },
          error: null,
        }
      }
    )
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result } = renderHook(
      () =>
        useAIPaginatedSearch({
          query: 'ontology',
          preset: 'strict',
          filterTag: 'philosophy',
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(result.current.noteGroups.length).toBe(4)
      expect(result.current.noteGroups[0]?.topScore).toBe(0.7)
      expect(result.current.aiHasMore).toBe(true)
    })

    act(() => {
      result.current.loadMoreAI()
    })

    await waitFor(() => {
      expect(result.current.aiOffset).toBe(5)
      expect(result.current.noteGroups[0]?.topScore).toBe(0.92)
      expect(result.current.noteGroups.map((group) => group.noteId)).toContain('note-5')
      expect(result.current.aiHasMore).toBe(false)
    })

    expect(invoke).toHaveBeenCalledTimes(2)
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({
          query: 'ontology',
          filterTag: 'philosophy',
          topK: 5,
        }),
      })
    )
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({
          query: 'ontology',
          filterTag: 'philosophy',
          topK: 10,
        }),
      })
    )
  })

  it('refreshes accumulated snippets when only bodyContent changes after refetch', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          chunks: [
            {
              ...createChunk('note-1', 0.8, 0, 0, 'embedding payload'),
              bodyContent: 'stale snippet',
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          chunks: [
            {
              ...createChunk('note-1', 0.8, 0, 0, 'embedding payload'),
              bodyContent: 'fresh snippet',
            },
          ],
        },
        error: null,
      })

    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result } = renderHook(
      () =>
        useAIPaginatedSearch({
          query: 'ontology',
          preset: 'strict',
          filterTag: null,
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.chunks[0]?.bodyContent).toBe('stale snippet')
    })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.chunks[0]?.bodyContent).toBe('fresh snippet')
    })
  })

  it('refreshes accumulated snippets when only overlapPrefix changes after refetch', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          chunks: [
            {
              ...createChunk('note-1', 0.8, 0, 0, 'embedding payload'),
              overlapPrefix: 'stale overlap',
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          chunks: [
            {
              ...createChunk('note-1', 0.8, 0, 0, 'embedding payload'),
              overlapPrefix: 'fresh overlap',
            },
          ],
        },
        error: null,
      })

    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result } = renderHook(
      () =>
        useAIPaginatedSearch({
          query: 'ontology',
          preset: 'strict',
          filterTag: null,
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.chunks[0]?.overlapPrefix).toBe('stale overlap')
    })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.chunks[0]?.overlapPrefix).toBe('fresh overlap')
    })
  })

  it('resets offset when search identity changes and does not over-fetch with stale pagination', async () => {
    const invoke = jest.fn().mockImplementation(
      async (_fn: string, { body }: { body: { topK: number; query: string } }) => ({
        data: {
          chunks: Array.from({ length: body.topK }, (_, idx) => ({
            noteId: `${body.query}-note-${idx + 1}`,
            noteTitle: `Title ${body.query}-${idx + 1}`,
            noteTags: ['tag'],
            chunkIndex: 0,
            charOffset: idx * 100,
            bodyContent: `${body.query} snippet ${idx + 1}`,
            overlapPrefix: '',
            content: `${body.query} snippet ${idx + 1}`,
            similarity: 0.9 - idx * 0.001,
          })),
        },
        error: null,
      })
    )
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result, rerender } = renderHook(
      (props: HookProps) => useAIPaginatedSearch(props),
      {
        initialProps: {
          query: 'ontology',
          preset: 'strict',
          filterTag: null,
          isEnabled: true,
        },
        wrapper: createWrapper(supabase),
      }
    )

    await waitFor(() => {
      expect(result.current.noteGroups.length).toBe(5)
    })

    act(() => {
      result.current.loadMoreAI()
    })

    await waitFor(() => {
      expect(result.current.aiOffset).toBe(5)
    })

    rerender({
      query: 'ethics',
      preset: 'strict',
      filterTag: null,
      isEnabled: true,
    })

    await waitFor(() => {
      expect(result.current.aiOffset).toBe(0)
      expect(result.current.noteGroups[0]?.noteId).toBe('ethics-note-1')
    })

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'ontology', topK: 5 }),
      })
    )
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'ontology', topK: 10 }),
      })
    )
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'ethics', topK: 5 }),
      })
    )
    expect(invoke).not.toHaveBeenCalledWith(
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'ethics', topK: 10 }),
      })
    )
  })

  it('keeps results empty when the AI search endpoint returns an error', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'boom' } })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result } = renderHook(
      () =>
        useAIPaginatedSearch({
          query: 'ontology',
          preset: 'strict',
          filterTag: null,
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(result.current.error).toContain('boom')
    }, { timeout: 3000 })

    expect(result.current.noteGroups).toEqual([])
    expect(result.current.aiHasMore).toBe(false)
    expect(invoke).toHaveBeenCalledWith(
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({
          query: 'ontology',
          topK: 5,
        }),
      })
    )
  })
})
