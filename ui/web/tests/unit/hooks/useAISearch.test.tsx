import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RagChunk } from '@core/types/ragSearch'
import { useAISearch } from '@ui/web/hooks/useAISearch'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

const createWrapper = (supabase: SupabaseClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SupabaseTestProvider supabase={supabase}>{children}</SupabaseTestProvider>
  }

const chunk = (overrides: Partial<RagChunk> = {}): RagChunk => ({
  noteId: 'note-1',
  noteTitle: 'Note 1',
  noteTags: ['work'],
  chunkIndex: 0,
  charOffset: 0,
  bodyContent: 'snippet',
  overlapPrefix: '',
  content: 'snippet',
  similarity: 0.8,
  ...overrides,
})

describe('useAISearch', () => {
  it('does not invoke the service for disabled or too-short queries', () => {
    const invoke = jest.fn()
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const { result, rerender } = renderHook(
      (props: { query: string; isEnabled: boolean }) => useAISearch({
        query: props.query,
        preset: 'strict',
        filterTag: null,
        isEnabled: props.isEnabled,
      }),
      {
        initialProps: { query: 'ab', isEnabled: true },
        wrapper: createWrapper(supabase),
      },
    )

    expect(result.current.noteGroups).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(invoke).not.toHaveBeenCalled()

    rerender({ query: 'ontology', isEnabled: false })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('trims the query and groups, sorts, and deduplicates returned chunks', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        chunks: [
          chunk({ noteId: 'note-2', noteTitle: 'Second', similarity: 0.7, charOffset: 0 }),
          chunk({ noteId: 'note-1', similarity: 0.95, charOffset: 0 }),
          chunk({ noteId: 'note-1', similarity: 0.9, charOffset: 100 }),
          chunk({ noteId: 'note-1', similarity: 0.85, charOffset: 400, chunkIndex: 2 }),
        ],
      },
      error: null,
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    const { result } = renderHook(
      () => useAISearch({ query: '  ontology  ', preset: 'strict', filterTag: 'work', isEnabled: true }),
      { wrapper: createWrapper(supabase) },
    )

    await waitFor(() => expect(result.current.noteGroups).toHaveLength(2))
    expect(invoke).toHaveBeenCalledWith('rag-search', {
      body: { query: 'ontology', topK: 5, threshold: 0.75, filterTag: 'work' },
    })
    expect(result.current.noteGroups[0]).toMatchObject({
      noteId: 'note-1',
      topScore: 0.95,
      hiddenCount: 1,
    })
    expect(result.current.noteGroups[0]?.chunks.map((item) => item.charOffset)).toEqual([0, 400])
    expect(result.current.noteGroups[1]).toMatchObject({ noteId: 'note-2', topScore: 0.7 })
  })

  it('returns an empty result for a successful empty response', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { chunks: null }, error: null })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    const { result } = renderHook(
      () => useAISearch({ query: 'empty', preset: 'broad', filterTag: null, isEnabled: true }),
      { wrapper: createWrapper(supabase) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(invoke).toHaveBeenCalled()
    expect(result.current.noteGroups).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('surfaces service errors after the configured retry and keeps groups empty', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: { message: 'search unavailable' } })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    const { result } = renderHook(
      () => useAISearch({ query: 'ontology', preset: 'neutral', filterTag: null, isEnabled: true }),
      { wrapper: createWrapper(supabase) },
    )

    await waitFor(() => expect(result.current.error).toContain('search unavailable'), { timeout: 3000 })
    expect(result.current.noteGroups).toEqual([])
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('isolates a previous query when the search identity changes', async () => {
    let resolveOld: ((value: { data: { chunks: RagChunk[] }; error: null }) => void) | undefined
    const oldResponse = new Promise<{ data: { chunks: RagChunk[] }; error: null }>((resolve) => {
      resolveOld = resolve
    })
    const invoke = jest.fn().mockImplementation((_name: string, options: { body: { query: string } }) => {
      if (options.body.query === 'old') return oldResponse
      return Promise.resolve({ data: { chunks: [chunk({ noteId: 'new-note' })] }, error: null })
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    const { result, rerender } = renderHook(
      (props: { query: string }) => useAISearch({ query: props.query, preset: 'strict', filterTag: null, isEnabled: true }),
      { initialProps: { query: 'old' }, wrapper: createWrapper(supabase) },
    )

    rerender({ query: 'new' })
    await waitFor(() => expect(result.current.noteGroups[0]?.noteId).toBe('new-note'))
    await act(async () => {
      resolveOld?.({ data: { chunks: [chunk({ noteId: 'old-note' })] }, error: null })
      await Promise.resolve()
    })
    expect(result.current.noteGroups[0]?.noteId).toBe('new-note')
  })
})
