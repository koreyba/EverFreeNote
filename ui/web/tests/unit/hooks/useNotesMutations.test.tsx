import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { Tables } from '@/supabase/types'

import {
  useCreateNote,
  useDeleteNote,
  useRemoveTag,
  useUpdateNote,
} from '@ui/web/hooks/useNotesMutations'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

type Note = Tables<'notes'>

const mockNoteService = {
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}
const mockSupabase = {}

jest.mock('@ui/web/providers/SupabaseProvider', () => ({ useSupabase: jest.fn() }))
jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => mockNoteService),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'Original',
  description: 'Description',
  tags: ['one'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  user_id: 'user-1',
  ...overrides,
})

const pageData = (notes: Note[] = [makeNote()]) => ({
  pages: [{ notes, nextCursor: undefined, totalCount: notes.length, hasMore: false }],
  pageParams: [0],
})

function renderMutation<T>(hook: () => T, initialData?: ReturnType<typeof pageData>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  if (initialData) queryClient.setQueryData(['notes'], initialData)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(hook, { wrapper }) }
}

describe('useNotesMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSupabase).mockReturnValue({ supabase: mockSupabase as never, user: null, loading: false })
    mockNoteService.createNote.mockResolvedValue(makeNote({ id: 'created' }))
    mockNoteService.updateNote.mockResolvedValue(makeNote({ title: 'Saved' }))
    mockNoteService.deleteNote.mockResolvedValue('note-1')
  })

  it('optimistically creates a note when no pages exist and invalidates on success', async () => {
    let resolveCreate: ((note: Note) => void) | undefined
    mockNoteService.createNote.mockReturnValue(new Promise<Note>((resolve) => { resolveCreate = resolve }))
    const onSuccess = jest.fn()
    const { result, queryClient } = renderMutation(() => useCreateNote({ onSuccess }))
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    let mutation: Promise<Note>
    act(() => {
      mutation = result.current.mutateAsync({ title: 'New', description: 'Body', tags: [], userId: 'user-1' })
    })
    await waitFor(() => expect(queryClient.getQueryData(['notes'])).toEqual(expect.objectContaining({
      pages: [expect.objectContaining({ notes: [expect.objectContaining({ title: 'New' })] })],
    })))

    act(() => {
      if (resolveCreate) resolveCreate(makeNote({ id: 'created', title: 'New' }))
    })
    await act(async () => { await mutation })

    expect(mockNoteService.createNote).toHaveBeenCalledWith({ title: 'New', description: 'Body', tags: [], userId: 'user-1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notes'] })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('rolls back a failed create and calls its error callback', async () => {
    const previous = pageData()
    const failure = new Error('create failed')
    mockNoteService.createNote.mockRejectedValue(failure)
    const onError = jest.fn()
    const { result, queryClient } = renderMutation(() => useCreateNote({ onError }), previous)

    await expect(result.current.mutateAsync({ title: 'New', description: 'Body', tags: [], userId: 'user-1' })).rejects.toThrow('create failed')
    expect(queryClient.getQueryData(['notes'])).toEqual(previous)
    expect(onError).toHaveBeenCalledWith(failure)
  })

  it('updates matching notes optimistically and leaves an empty cache unchanged', async () => {
    let resolveUpdate: ((note: Note) => void) | undefined
    mockNoteService.updateNote.mockReturnValue(new Promise<Note>((resolve) => { resolveUpdate = resolve }))
    const onSuccess = jest.fn()
    const { result, queryClient } = renderMutation(() => useUpdateNote({ onSuccess }), pageData())

    let mutation: Promise<Note>
    act(() => {
      mutation = result.current.mutateAsync({ id: 'note-1', title: 'Edited', description: 'Changed', tags: ['two'] })
    })
    await waitFor(() => expect(queryClient.getQueryData(['notes'])).toEqual(expect.objectContaining({
      pages: [expect.objectContaining({ notes: [expect.objectContaining({ title: 'Edited', tags: ['two'] })] })],
    })))
    act(() => {
      if (resolveUpdate) resolveUpdate(makeNote({ title: 'Edited', description: 'Changed', tags: ['two'] }))
    })
    await act(async () => { await mutation })
    expect(mockNoteService.updateNote).toHaveBeenCalledWith('note-1', { title: 'Edited', description: 'Changed', tags: ['two'] })
    expect(onSuccess).toHaveBeenCalled()

    mockNoteService.updateNote.mockResolvedValueOnce(makeNote())
    const empty = renderMutation(() => useUpdateNote(), undefined)
    await act(async () => {
      await empty.result.current.mutateAsync({ id: 'missing', title: 'Title', description: 'Body', tags: [] })
    })
    expect(empty.queryClient.getQueryData(['notes'])).toBeUndefined()
  })

  it('rolls back a failed update', async () => {
    const previous = pageData()
    mockNoteService.updateNote.mockRejectedValue(new Error('update failed'))
    const onError = jest.fn()
    const { result, queryClient } = renderMutation(() => useUpdateNote({ onError }), previous)

    await expect(result.current.mutateAsync({ id: 'note-1', title: 'Edited', description: 'Changed', tags: [] })).rejects.toThrow('update failed')
    expect(queryClient.getQueryData(['notes'])).toEqual(previous)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('deletes optimistically, honors silent success, and rolls back failures', async () => {
    const onSuccess = jest.fn()
    const { result, queryClient } = renderMutation(() => useDeleteNote({ onSuccess }), pageData())
    await act(async () => {
      await result.current.mutateAsync({ id: 'note-1', silent: true })
    })
    expect(queryClient.getQueryData(['notes'])).toEqual(expect.objectContaining({
      pages: [expect.objectContaining({ notes: [] })],
    }))
    expect(onSuccess).not.toHaveBeenCalled()

    const previous = pageData()
    mockNoteService.deleteNote.mockRejectedValue(new Error('delete failed'))
    const onError = jest.fn()
    const failed = renderMutation(() => useDeleteNote({ onError }), previous)
    await expect(failed.result.current.mutateAsync({ id: 'note-1' })).rejects.toThrow('delete failed')
    expect(failed.queryClient.getQueryData(['notes'])).toEqual(previous)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('removes tags optimistically and restores them on failure', async () => {
    const onSuccess = jest.fn()
    const { result, queryClient } = renderMutation(() => useRemoveTag({ onSuccess }), pageData())
    await act(async () => {
      await result.current.mutateAsync({ noteId: 'note-1', updatedTags: [] })
    })
    expect(queryClient.getQueryData(['notes'])).toEqual(expect.objectContaining({
      pages: [expect.objectContaining({ notes: [expect.objectContaining({ tags: [] })] })],
    }))
    expect(mockNoteService.updateNote).toHaveBeenCalledWith('note-1', { tags: [] })
    expect(onSuccess).toHaveBeenCalled()

    const previous = pageData()
    mockNoteService.updateNote.mockRejectedValue(new Error('tag update failed'))
    const onError = jest.fn()
    const failed = renderMutation(() => useRemoveTag({ onError }), previous)
    await expect(failed.result.current.mutateAsync({ noteId: 'note-1', updatedTags: [] })).rejects.toThrow('tag update failed')
    expect(failed.queryClient.getQueryData(['notes'])).toEqual(previous)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})
