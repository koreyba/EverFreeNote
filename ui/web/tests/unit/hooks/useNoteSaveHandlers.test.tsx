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
    setSelectedNote: jest.fn((updater) => {
      if (typeof updater === 'function') {
        updater(note);
      }
    }),
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

describe('durable save failures and concurrent creation', () => {
  it.each(['cache', 'queue'])('does not acknowledge a failed %s write', async (target) => {
    const error = new Error('Storage unavailable')
    const log = jest.spyOn(console, 'error').mockImplementation()
    const { result, params } = setup(target === 'cache'
      ? { offlineCache: { saveNote: jest.fn().mockRejectedValue(error) } }
      : { enqueueMutation: jest.fn().mockRejectedValue(error) })
    await act(async () => {
      await expect(result.current.handleSaveNote({ title: 'Keep me', description: '', tags: '' })).rejects.toThrow(error)
    })
    expect(params.setLastSavedAt).not.toHaveBeenCalled()
    expect(result.current.saving).toBe(false)
    log.mockRestore()
  })

  it('queues one create followed by the latest update when manual save overlaps autosave', async () => {
    let finishWrite = () => {}
    const writing = new Promise<void>(resolve => { finishWrite = resolve })
    const saveNote = jest.fn().mockReturnValueOnce(writing).mockResolvedValue(undefined)
    const { result, params } = setup({ selectedNote: null, selectedNoteRef: { current: null }, offlineCache: { saveNote } })
    let autoSave: ReturnType<typeof result.current.handleAutoSave>
    let manualSave: ReturnType<typeof result.current.handleSaveNote>
    act(() => {
      autoSave = result.current.handleAutoSave({ title: 'First', description: '', tags: '' })
      manualSave = result.current.handleSaveNote({ title: 'Latest', description: 'Body', tags: '' })
    })
    expect(saveNote).toHaveBeenCalledTimes(1)
    await act(async () => { finishWrite(); await autoSave; await manualSave })
    expect(params.enqueueMutation.mock.calls.map(([item]: [{ operation: string; noteId: string }]) => [item.operation, item.noteId]))
      .toEqual([['create', 'mock-uuid'], ['update', 'mock-uuid']])
    expect(saveNote).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Latest', description: 'Body' }))
  })
})

describe('durable local saves', () => {
  it('removes an online-deleted note from persistent cache and the offline list', async () => {
    const { result, params } = setup({ noteToDelete: makeNote() })
    await act(async () => { await result.current.confirmDeleteNote() })
    expect(params.offlineCache.deleteNote).toHaveBeenCalledWith('note-1')
    const update = params.setOfflineOverlay.mock.calls.at(-1)?.[0]
    expect(update([{ id: 'note-1' }, { id: 'keep' }])).toEqual([{ id: 'keep' }])
  })

  it('creates locally even when online is reported but the backend is unreachable', async () => {
    const { result, params } = setup({
      selectedNote: null,
      selectedNoteRef: { current: null },
      createNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) },
    })
    await act(async () => {
      await expect(result.current.handleAutoSave({ title: 'Offline draft', description: 'Body', tags: '' }))
        .resolves.toEqual({ noteId: 'mock-uuid' })
    })
    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'mock-uuid', title: 'Offline draft' }))
    expect(params.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({ operation: 'create', noteId: 'mock-uuid' }))
    expect(params.createNoteMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('acknowledges manual creation after durable local persistence without contacting the backend', async () => {
    const { result, params } = setup({ selectedNote: null, selectedNoteRef: { current: null },
      createNoteMutation: { mutateAsync: jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) } })
    await act(async () => {
      await expect(result.current.handleSaveNote({ title: 'Manual offline', description: '', tags: '' })).resolves.toBeUndefined()
    })
    expect(params.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({ operation: 'create', payload: expect.objectContaining({ title: 'Manual offline' }) }))
    expect(params.createNoteMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('queues an explicit update even when connectivity is reported as online', async () => {
    const { result, params } = setup()
    await act(async () => { await result.current.handleSaveNote({ title: 'Locally saved', description: 'New body', tags: '' }) })
    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', description: 'New body' }))
    expect(params.updateNoteMutation.mutateAsync).not.toHaveBeenCalled()
  })
})
