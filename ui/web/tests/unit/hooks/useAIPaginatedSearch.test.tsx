import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RagChunk } from '@core/types/ragSearch'
import { useAIPaginatedSearch } from '@ui/web/hooks/useAIPaginatedSearch'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

type HookProps = {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
  resultMode?: 'note' | 'chunk'
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
          topK: 5,
          threshold: 0.75,
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
              hasMore: true,
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
            ],
            hasMore: false,
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
          topK: 5,
          threshold: 0.75,
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

  it('auto-expands chunk retrieval in note mode until the first note page is filled or exhausted', async () => {
    const invoke = jest.fn().mockImplementation(
      async (_fn: string, { body }: { body: { topK: number; query: string } }) => {
        if (body.topK === 15) {
          return {
            data: {
              chunks: Array.from({ length: 15 }, (_, idx) =>
                createChunk('note-1', 0.9 - idx * 0.001, idx, idx * 400, `note-1 snippet ${idx + 1}`)
              ),
              hasMore: true,
            },
            error: null,
          }
        }

        return {
          data: {
            chunks: [
              ...Array.from({ length: 15 }, (_, idx) =>
                createChunk('note-1', 0.9 - idx * 0.001, idx, idx * 400, `note-1 snippet ${idx + 1}`)
              ),
              createChunk('note-2', 0.72, 0, 0, 'note-2 snippet'),
            ],
            hasMore: false,
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
          query: 'quadrants',
          topK: 15,
          threshold: 0.25,
          filterTag: null,
          isEnabled: true,
          resultMode: 'note',
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(result.current.noteGroups.map((group) => group.noteId)).toEqual(['note-1', 'note-2'])
      expect(result.current.aiHasMore).toBe(false)
    })

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'quadrants', topK: 15 }),
      })
    )
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'rag-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'quadrants', topK: 30 }),
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
          hasMore: false,
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
          hasMore: false,
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
          topK: 5,
          threshold: 0.75,
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
          hasMore: false,
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
          hasMore: false,
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
          topK: 5,
          threshold: 0.75,
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
          hasMore: body.query === 'ontology' && body.topK === 5,
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
          topK: 5,
          threshold: 0.75,
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
      topK: 5,
      threshold: 0.75,
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

  it('hides stale results while a new search identity is loading', async () => {
    let resolveNextSearch: ((value: unknown) => void) | null = null
    const invoke = jest.fn().mockImplementation(
      async (_fn: string, { body }: { body: { query: string; topK: number } }) => {
        if (body.query === 'ontology') {
          return {
            data: {
              chunks: [createChunk('note-1', 0.8, 0, 0, 'ontology snippet')],
              hasMore: false,
            },
            error: null,
          }
        }

        return await new Promise((resolve) => {
          resolveNextSearch = resolve
        })
      }
    )
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const { result, rerender } = renderHook(
      (props: HookProps) => useAIPaginatedSearch(props),
      {
        initialProps: {
          query: 'ontology',
          topK: 5,
          threshold: 0.75,
          filterTag: null,
          isEnabled: true,
        },
        wrapper: createWrapper(supabase),
      }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.noteId).toBe('note-1')
    })

    rerender({
      query: 'ethics',
      topK: 5,
      threshold: 0.75,
      filterTag: null,
      isEnabled: true,
    })

    expect(result.current.noteGroups).toEqual([])
    expect(result.current.aiAccumulatedResults).toEqual([])
    expect(result.current.isLoading).toBe(true)

    act(() => {
      resolveNextSearch?.({
        data: {
          chunks: [createChunk('note-2', 0.81, 0, 0, 'ethics snippet')],
          hasMore: false,
        },
        error: null,
      })
    })

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.noteId).toBe('note-2')
      expect(result.current.isLoading).toBe(false)
    })
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
          topK: 5,
          threshold: 0.75,
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

  it('falls back to legacy content when bodyContent is missing from rag-search results', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        chunks: [
          {
            noteId: 'note-legacy',
            noteTitle: 'Legacy note',
            noteTags: ['tag'],
            chunkIndex: 0,
            charOffset: 12,
            content: 'Legacy chunk text',
            similarity: 0.88,
          },
        ],
        hasMore: false,
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
          topK: 5,
          threshold: 0.75,
          filterTag: null,
          isEnabled: true,
        }),
      { wrapper: createWrapper(supabase) }
    )

    await waitFor(() => {
      expect(result.current.noteGroups[0]?.chunks[0]?.content).toBe('Legacy chunk text')
    })

    expect(result.current.noteGroups[0]?.chunks[0]?.bodyContent).toBeUndefined()
    expect(result.current.noteGroups[0]?.chunks[0]?.overlapPrefix).toBeUndefined()
  })
})
