import { renderHook, act } from '@testing-library/react'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import type { NoteViewModel } from '@core/types/domain'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNote = (overrides?: Partial<NoteViewModel>): NoteViewModel => ({
  id: 'note-1',
  title: 'Test',
  description: 'Content',
  tags: ['tag1'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  ...overrides,
})

function setup(overrides: Record<string, unknown> = {}) {
  const note = makeNote()
  const defaults = {
    user: { id: 'user-1' },
    isOffline: false,
    offlineCache: { saveNote: jest.fn(), loadNotes: jest.fn(), deleteNote: jest.fn() },
    enqueueMutation: jest.fn(),
    offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } },
    setOfflineOverlay: jest.fn(),
    setPendingCount: jest.fn(),
    setFailedCount: jest.fn(),
    setLastSavedAt: jest.fn(),
    createNoteMutation: { mutateAsync: jest.fn() },
    updateNoteMutation: { mutateAsync: jest.fn().mockResolvedValue({}) },
    deleteNoteMutation: { mutateAsync: jest.fn() },
    removeTagMutation: { mutateAsync: jest.fn() },
    selectedNote: note,
    setSelectedNote: jest.fn(),
    setIsEditing: jest.fn(),
    noteToDelete: null,
    setDeleteDialogOpen: jest.fn(),
    setNoteToDelete: jest.fn(),
    notes: [note],
    notesRef: { current: [note] },
    selectedNoteRef: { current: note },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = { ...defaults, ...overrides } as any
  return { params, ...renderHook(() => useNoteSaveHandlers(params)) }
}

// ---------------------------------------------------------------------------
// Tests — only the online upsert path of handleSaveNote.
// Offline path, resolveOpenableNote, and performSync are tested elsewhere.
// ---------------------------------------------------------------------------

describe('useNoteSaveHandlers — handleSaveNote upsert', () => {
  it('updates existing note when server still has it', async () => {
    const updatedData = { id: 'note-1', title: 'Saved', description: '', tags: [] }
    const { result, params } = setup({
      updateNoteMutation: { mutateAsync: jest.fn().mockResolvedValue(updatedData) },
    })

    await act(async () => {
      await result.current.handleSaveNote({ title: 'Saved', description: '', tags: '' })
    })

    expect(params.updateNoteMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', title: 'Saved' }),
    )
    expect(params.createNoteMutation.mutateAsync).not.toHaveBeenCalled()
    expect(params.setLastSavedAt).toHaveBeenCalled()
  })

  it('re-creates note with same ID when update fails with PGRST116 (remote deletion)', async () => {
    const recreated = makeNote({ title: 'Recreated' })
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })
    const { result, params } = setup({
      updateNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(pgrst116) },
      createNoteMutation: { mutateAsync: jest.fn().mockResolvedValue(recreated) },
    })

    await act(async () => {
      await result.current.handleSaveNote({ title: 'Recreated', description: 'Body', tags: '' })
    })

    expect(params.updateNoteMutation.mutateAsync).toHaveBeenCalled()
    expect(params.createNoteMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', userId: 'user-1', title: 'Recreated' }),
    )
    expect(params.setLastSavedAt).toHaveBeenCalled()
  })

  it('re-throws non-PGRST116 update errors without attempting create', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result, params } = setup({
      updateNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new Error('network failure')) },
      createNoteMutation: { mutateAsync: jest.fn() },
    })

    await act(async () => {
      await result.current.handleSaveNote({ title: 'X', description: '', tags: '' })
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error saving note:', expect.any(Error))
    expect(params.createNoteMutation.mutateAsync).not.toHaveBeenCalled()
    expect(params.setLastSavedAt).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('logs error when PGRST116 update → create fallback also fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })

    const { result, params } = setup({
      updateNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(pgrst116) },
      createNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new Error('create fail')) },
    })

    await act(async () => {
      await result.current.handleSaveNote({ title: 'X', description: '', tags: '' })
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error saving note:', expect.any(Error))
    expect(params.createNoteMutation.mutateAsync).toHaveBeenCalled()
    expect(params.setLastSavedAt).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
