import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import type { NoteViewModel } from '@core/types/domain'

type SaveHandlersParams = Parameters<typeof useNoteSaveHandlers>[0]
type SaveHandlersOverrides = Partial<SaveHandlersParams>
type SelectedNoteState = Parameters<SaveHandlersParams['setSelectedNote']>[0]

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('uuid', () => ({ v4: () => 'generated-note-id' }))

const makeNote = (overrides: Partial<NoteViewModel> = {}): NoteViewModel => ({
  id: 'note-1',
  title: 'Original',
  description: 'Original body',
  tags: ['alpha', 'beta'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  ...overrides,
})

function setup(overrides: SaveHandlersOverrides = {}) {
  const selectedNote = overrides.selectedNote !== undefined
    ? overrides.selectedNote
    : makeNote()
  const selectedNoteRef = overrides.selectedNoteRef ?? { current: selectedNote }
  const setSelectedNote = jest.fn<ReturnType<SaveHandlersParams['setSelectedNote']>, Parameters<SaveHandlersParams['setSelectedNote']>>((value) => {
    selectedNoteRef.current = typeof value === 'function'
      ? value(selectedNoteRef.current)
      : value
  })
  const defaults: SaveHandlersParams = {
    user: { id: 'user-1' },
    isOffline: false,
    offlineCache: {
      saveNote: jest.fn().mockResolvedValue(undefined),
    },
    enqueueMutation: jest.fn().mockResolvedValue(undefined),
    offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } },
    setOfflineOverlay: jest.fn(),
    setPendingCount: jest.fn(),
    setFailedCount: jest.fn(),
    setLastSavedAt: jest.fn(),
    createNoteMutation: { mutateAsync: jest.fn() },
    updateNoteMutation: { mutateAsync: jest.fn().mockResolvedValue({}) },
    deleteNoteMutation: { mutateAsync: jest.fn().mockResolvedValue(undefined) },
    removeTagMutation: { mutateAsync: jest.fn().mockResolvedValue(undefined) },
    selectedNote,
    setSelectedNote,
    setIsEditing: jest.fn(),
    noteToDelete: null,
    setDeleteDialogOpen: jest.fn(),
    setNoteToDelete: jest.fn(),
    notes: selectedNote ? [selectedNote] : [],
    notesRef: { current: selectedNote ? [selectedNote] : [] },
    selectedNoteRef,
    ...overrides,
  }
  const params: SaveHandlersParams = { ...defaults, setSelectedNote, selectedNoteRef }
  return {
    params,
    setSelectedNote,
    ...renderHook(() => useNoteSaveHandlers(params)),
  }
}

describe('useNoteSaveHandlers additional observable behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('creates a new note offline, updates the overlay, queues the write, and returns the generated id', async () => {
    const queue = [{ status: 'pending' }, { status: 'failed' }]
    const { result, params } = setup({
      selectedNote: null,
      selectedNoteRef: { current: null },
      offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue(queue) } },
      isOffline: true,
    })

    await act(async () => {
      await expect(result.current.handleAutoSave({
        title: '  New note  ',
        description: '  Body  ',
        tags: 'alpha, beta',
      })).resolves.toEqual({ noteId: 'generated-note-id' })
    })

    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      id: 'generated-note-id',
      title: 'New note',
      description: 'Body',
      tags: ['alpha', 'beta'],
      status: 'pending',
    }))
    expect(params.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'generated-note-id',
      operation: 'create',
      payload: { title: 'New note', description: 'Body', tags: ['alpha', 'beta'], userId: 'user-1' },
    }))
    expect(params.setOfflineOverlay).toHaveBeenCalledWith(expect.any(Function))
    expect(params.setPendingCount).toHaveBeenCalledWith(expect.any(Function))
    expect(params.setFailedCount).toHaveBeenCalledWith(1)
    expect(params.setLastSavedAt).toHaveBeenCalledWith(expect.any(String))
  })

  it('updates an existing note offline with parsed tags and the current timestamp', async () => {
    const note = makeNote()
    const { result, params } = setup({ isOffline: true, selectedNote: note })

    await act(async () => {
      await result.current.handleAutoSave({ noteId: note.id, title: 'Updated', tags: 'one, two' })
    })

    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      id: note.id,
      title: 'Updated',
      description: 'Original body',
      tags: ['one', 'two'],
      status: 'pending',
    }))
    expect(params.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'update',
      noteId: note.id,
      payload: { title: 'Updated', description: 'Original body', tags: ['one', 'two'] },
    }))
    expect(params.setOfflineOverlay).toHaveBeenCalledWith(expect.any(Function))
  })

  it('does not create an empty new note and clears its auto-save guard after an async failure', async () => {
    const empty = setup({ selectedNote: null, selectedNoteRef: { current: null } })
    await act(async () => {
      await expect(empty.result.current.handleAutoSave({ title: ' ', description: '', tags: '' }))
        .resolves.toBeUndefined()
    })
    expect(empty.params.createNoteMutation.mutateAsync).not.toHaveBeenCalled()

    jest.useFakeTimers()
    const failure = setup({
      selectedNote: null,
      selectedNoteRef: { current: null },
      createNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new Error('offline server')) },
    })
    await act(async () => {
      await expect(failure.result.current.handleAutoSave({ title: 'Will fail' })).rejects.toThrow('offline server')
    })
    jest.runOnlyPendingTimers()
    expect(failure.result.current.autoSaving).toBe(false)
    jest.clearAllTimers()
  })

  it('queues an offline deletion and closes the confirmation state', async () => {
    const note = makeNote()
    const { result, params, setSelectedNote } = setup({
      isOffline: true,
      selectedNote: note,
      noteToDelete: note,
    })

    await act(async () => {
      await result.current.confirmDeleteNote()
    })

    expect(params.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({
      noteId: note.id,
      operation: 'delete',
      payload: {},
    }))
    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      id: note.id,
      deleted: true,
      status: 'pending',
    }))
    expect(toast.success).toHaveBeenCalledWith('Deletion queued offline')
    const setSelectedNoteCalls = setSelectedNote.mock.calls
    const clearSelection = setSelectedNoteCalls
      .map(([value]) => value)
      .find((value): value is Exclude<SelectedNoteState, null | NoteViewModel> => typeof value === 'function')
    expect(clearSelection?.(note)).toBeNull()
    expect(params.setIsEditing).toHaveBeenCalledWith(false)
    expect(params.setDeleteDialogOpen).toHaveBeenCalledWith(false)
    expect(params.setNoteToDelete).toHaveBeenCalledWith(null)
  })

  it('deletes an online note without clearing a different selected note', async () => {
    const selected = makeNote({ id: 'selected' })
    const deleting = makeNote({ id: 'deleting' })
    const { result, params } = setup({ selectedNote: selected, noteToDelete: deleting })

    await act(async () => {
      await result.current.confirmDeleteNote()
    })

    expect(params.deleteNoteMutation.mutateAsync).toHaveBeenCalledWith({ id: 'deleting' })
    expect(params.setSelectedNote).not.toHaveBeenCalledWith(null)
    expect(params.setDeleteDialogOpen).toHaveBeenCalledWith(false)
    expect(params.setNoteToDelete).toHaveBeenCalledWith(null)
  })

  it('updates selected note after removing a tag and ignores notes without tags', async () => {
    const note = makeNote({ tags: ['keep', 'remove'] })
    const { result, params } = setup({ selectedNote: note, notes: [note] })

    await act(async () => {
      await result.current.handleRemoveTagFromNote(note.id, 'remove')
    })
    expect(params.removeTagMutation.mutateAsync).toHaveBeenCalledWith({
      noteId: note.id,
      updatedTags: ['keep'],
    })
    expect(params.setSelectedNote).toHaveBeenCalledWith(expect.objectContaining({
      id: note.id,
      tags: ['keep'],
    }))

    const noTags = setup({ notes: [makeNote({ id: 'no-tags', tags: undefined })], selectedNote: null })
    await act(async () => {
      await noTags.result.current.handleRemoveTagFromNote('no-tags', 'remove')
    })
    expect(noTags.params.removeTagMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('logs delete and tag-removal failures while completing cleanup', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const note = makeNote()
    const { result, params } = setup({
      noteToDelete: note,
      deleteNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new Error('delete failed')) },
      removeTagMutation: { mutateAsync: jest.fn().mockRejectedValue(new Error('tag failed')) },
    })

    await act(async () => {
      await result.current.confirmDeleteNote()
      await result.current.handleRemoveTagFromNote(note.id, 'alpha')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error deleting note:', expect.any(Error))
    expect(consoleSpy).toHaveBeenCalledWith('Error removing tag:', expect.any(Error))
    expect(params.setDeleteDialogOpen).toHaveBeenCalledWith(false)
    expect(params.setNoteToDelete).toHaveBeenCalledWith(null)
    consoleSpy.mockRestore()
  })
})
