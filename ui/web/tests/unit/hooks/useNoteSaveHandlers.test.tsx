import { renderHook, act } from '@testing-library/react'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import type { NoteViewModel } from '@core/types/domain'
import { toast } from 'sonner'

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
    enqueueMutation: jest.fn(async (_item, applyLocal) => { await applyLocal?.() }),
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

describe('reading an unchanged note', () => {
  it('keeps a newly saved note selected when the reading callback still has the pre-save snapshot', async () => {
    const selectedNoteRef: { current: NoteViewModel | null } = { current: null }
    let selectedNote: NoteViewModel | null = null
    const setSelectedNote = jest.fn((value: NoteViewModel | null | ((previous: NoteViewModel | null) => NoteViewModel | null)) => {
      selectedNote = typeof value === 'function' ? value(selectedNote) : value
    })
    const { result, params } = setup({ selectedNote: null, selectedNoteRef, setSelectedNote })

    await act(async () => {
      const draft = { title: 'Offline draft', description: 'Saved text', tags: '' }
      await result.current.handleSaveNote(draft)
      await result.current.handleReadNote(draft)
    })

    expect(selectedNote).toEqual(expect.objectContaining({ id: 'mock-uuid', title: 'Offline draft' }))
    expect(params.setIsEditing).toHaveBeenCalledWith(false)
  })

  it('switches to reading without creating a durable write', async () => {
    const { result, params } = setup()

    await act(async () => {
      await result.current.handleReadNote({ title: 'Test', description: 'Content', tags: 'tag1' })
    })

    expect(params.offlineCache.saveNote).not.toHaveBeenCalled()
    expect(params.enqueueMutation).not.toHaveBeenCalled()
    expect(params.setLastSavedAt).not.toHaveBeenCalled()
    expect(params.setIsEditing).toHaveBeenCalledWith(false)
  })

  it('does not rewrite legacy tag spelling when the displayed tags are unchanged', async () => {
    const note = makeNote({ tags: ['  Tag1 ', 'TAG1'] })
    const { result, params } = setup({ selectedNote: note, selectedNoteRef: { current: note } })

    await act(async () => {
      await result.current.handleReadNote({ title: note.title, description: note.description!, tags: 'tag1' })
    })

    expect(params.enqueueMutation).not.toHaveBeenCalled()
    expect(params.setIsEditing).toHaveBeenCalledWith(false)
  })

  it('waits for a matching in-flight save before switching to reading', async () => {
    let finish!: () => void
    const writing = new Promise<void>(resolve => { finish = resolve })
    const { result, params } = setup({ offlineCache: { saveNote: jest.fn().mockReturnValue(writing) } })
    let save!: Promise<unknown>
    let read!: Promise<void>

    await act(async () => {
      save = result.current.handleAutoSave({ noteId: 'note-1', title: 'Edited', description: 'Content', tags: 'tag1' })
      await Promise.resolve()
      read = result.current.handleReadNote({ title: 'Edited', description: 'Content', tags: 'tag1' })
      await Promise.resolve()
    })
    expect(params.setIsEditing).not.toHaveBeenCalled()
    await act(async () => { finish(); await save; await read })
    expect(params.offlineCache.saveNote).toHaveBeenCalledTimes(1)
    expect(params.setIsEditing).toHaveBeenCalledWith(false)
  })

  it('keeps editing if the matching in-flight save fails', async () => {
    let fail!: (error: Error) => void
    const writing = new Promise<void>((_resolve, reject) => { fail = reject })
    const { result, params } = setup({ offlineCache: { saveNote: jest.fn().mockReturnValue(writing) } })
    let save!: Promise<unknown>
    let read!: Promise<void>

    await act(async () => {
      save = result.current.handleAutoSave({ noteId: 'note-1', title: 'Edited', description: 'Content', tags: 'tag1' })
      void save.catch(() => {})
      await Promise.resolve()
      read = result.current.handleReadNote({ title: 'Edited', description: 'Content', tags: 'tag1' })
      void read.catch(() => {})
      await Promise.resolve()
    })
    await act(async () => {
      fail(new Error('Storage unavailable'))
      await expect(save).rejects.toThrow('Storage unavailable')
      await expect(read).rejects.toThrow('Storage unavailable')
    })
    expect(params.setIsEditing).not.toHaveBeenCalled()
    expect(params.offlineCache.saveNote).toHaveBeenCalledTimes(1)
  })

  it('preserves unedited body whitespace when manually saving a changed title', async () => {
    const note = makeNote({ description: '  Original plain body  ' })
    const { result, params } = setup({
      selectedNote: note,
      selectedNoteRef: { current: note },
      notes: [note],
      notesRef: { current: [note] },
    })

    await act(async () => {
      await result.current.handleSaveNote({ title: 'Changed', description: note.description!, tags: 'tag1' })
    })

    expect(params.offlineCache.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Changed', description: '  Original plain body  ',
    }))
  })
})

describe('durable save failures and concurrent creation', () => {
  it('does not start a local write when its tab is discarded while queue lookup is pending', async () => {
    let finishLookup!: (items: never[]) => void
    const held = new Promise<never[]>(resolve => { finishLookup = resolve })
    const controller = new AbortController()
    const finish = jest.fn()
    const { result, params } = setup({
      selectedNote: null,
      selectedNoteRef: { current: null },
      offlineQueueRef: { current: { getQueue: jest.fn().mockReturnValueOnce(held).mockResolvedValue([]) } },
      beginWorkspaceWrite: () => ({ signal: controller.signal, finish }),
    })
    let pending!: ReturnType<typeof result.current.handleAutoSave>
    await act(async () => { pending = result.current.handleAutoSave({ title: 'Uncommitted', description: '', tags: '' }); await Promise.resolve() })
    controller.abort()
    await act(async () => {
      finishLookup([])
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    })
    expect(params.offlineCache.saveNote).not.toHaveBeenCalled()
    expect(params.enqueueMutation).not.toHaveBeenCalled()
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it.each(['auto', 'manual'])('records the new note identity before an in-flight %s create finishes', async (kind) => {
    let finish!: () => void
    const held = new Promise<void>(resolve => { finish = resolve })
    const rememberPendingCreate = jest.fn()
    const { result } = setup({
      selectedNote: null,
      selectedNoteRef: { current: null },
      offlineCache: { saveNote: jest.fn().mockReturnValue(held) },
      rememberPendingCreate,
    })
    let pending!: Promise<unknown>
    await act(async () => {
      const data = { title: 'Draft before save', description: '', tags: '' }
      pending = kind === 'auto' ? result.current.handleAutoSave(data) : result.current.handleSaveNote(data)
      await Promise.resolve()
    })
    expect(rememberPendingCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'mock-uuid', user_id: 'user-1', title: 'Draft before save' }))
    await act(async () => { finish(); await pending })
  })

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
    await act(async () => {
      autoSave = result.current.handleAutoSave({ title: 'First', description: '', tags: '' })
      manualSave = result.current.handleSaveNote({ title: 'Latest', description: 'Body', tags: '' })
      await Promise.resolve()
    })
    expect(saveNote).toHaveBeenCalledTimes(1)
    await act(async () => { finishWrite(); await autoSave; await manualSave })
    expect(params.enqueueMutation.mock.calls.map(([item]: [{ operation: string; noteId: string }]) => [item.operation, item.noteId]))
      .toEqual([['create', 'mock-uuid'], ['update', 'mock-uuid']])
    expect(saveNote).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Latest', description: 'Body' }))
  })

  it('does not enqueue a newer manual save before an older autosave completes', async () => {
    let finishQueue = () => {}
    const firstQueueWrite = new Promise<void>(resolve => { finishQueue = resolve })
    const enqueueMutation = jest.fn().mockReturnValueOnce(firstQueueWrite).mockResolvedValue(undefined)
    const { result, params } = setup({ enqueueMutation })
    let autoSave!: ReturnType<typeof result.current.handleAutoSave>
    let manualSave!: ReturnType<typeof result.current.handleSaveNote>

    await act(async () => {
      autoSave = result.current.handleAutoSave({ noteId: 'note-1', title: 'Earlier', description: '', tags: '' })
      await Promise.resolve()
    })
    expect(enqueueMutation).toHaveBeenCalledTimes(1)
    await act(async () => {
      manualSave = result.current.handleSaveNote({ title: 'Latest', description: '', tags: '' })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(enqueueMutation).toHaveBeenCalledTimes(1)

    await act(async () => { finishQueue(); await autoSave; await manualSave })
    expect(enqueueMutation.mock.calls.map(([item]) => item.payload.title)).toEqual(['Earlier', 'Latest'])
    expect(params.offlineCache.saveNote).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'note-1', title: 'Latest' }))
  })

  it('orders saves and waits for deletion across remounts of the same account', async () => {
    let finish!: () => void
    const held = new Promise<void>(resolve => { finish = resolve })
    const saveNote = jest.fn().mockReturnValueOnce(held).mockResolvedValue(undefined)
    const enqueueMutation = jest.fn().mockResolvedValue(undefined)
    const shared = { offlineCache: { saveNote }, enqueueMutation }
    const first = setup(shared)
    let older!: ReturnType<typeof first.result.current.handleAutoSave>
    await act(async () => {
      older = first.result.current.handleAutoSave({ noteId: 'note-1', title: 'Earlier session', description: '', tags: '' })
      await Promise.resolve()
    })
    first.unmount()
    const second = setup(shared)
    let newer!: ReturnType<typeof second.result.current.handleAutoSave>
    let deletionReady = false
    await act(async () => {
      newer = second.result.current.handleAutoSave({ noteId: 'note-1', title: 'New session', description: '', tags: '' })
      void second.result.current.waitForPendingNoteWrites(['note-1']).then(() => { deletionReady = true })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(saveNote).toHaveBeenCalledTimes(1)
    expect(deletionReady).toBe(false)
    await act(async () => { finish(); await older; await newer })
    expect(saveNote.mock.calls.map(([note]) => note.title)).toEqual(['Earlier session', 'New session'])
    expect(enqueueMutation.mock.calls.map(([item]) => item.payload.title)).toEqual(['Earlier session', 'New session'])
  })

  it('does not serialize the same note id across different accounts', async () => {
    let finish!: () => void
    const held = new Promise<void>(resolve => { finish = resolve })
    const saveNote = jest.fn().mockReturnValueOnce(held).mockResolvedValue(undefined)
    const first = setup({ offlineCache: { saveNote } })
    let older!: ReturnType<typeof first.result.current.handleAutoSave>
    await act(async () => { older = first.result.current.handleAutoSave({ noteId: 'note-1', title: 'Account A', description: '', tags: '' }); await Promise.resolve() })
    const second = setup({ user: { id: 'user-2' }, offlineCache: { saveNote } })
    await act(async () => { await second.result.current.handleAutoSave({ noteId: 'note-1', title: 'Account B', description: '', tags: '' }) })
    expect(saveNote.mock.calls.map(([note]) => note.title)).toEqual(['Account A', 'Account B'])
    await act(async () => { finish(); await older })
  })

  it('lets a newer save run after an older write fails while reporting the failure', async () => {
    let failQueue!: (error: Error) => void
    const firstQueueWrite = new Promise<void>((_, reject) => { failQueue = reject })
    const enqueueMutation = jest.fn().mockReturnValueOnce(firstQueueWrite).mockResolvedValue(undefined)
    const { result, params } = setup({ enqueueMutation })
    let autoSave!: ReturnType<typeof result.current.handleAutoSave>
    let manualSave!: ReturnType<typeof result.current.handleSaveNote>
    await act(async () => {
      autoSave = result.current.handleAutoSave({ noteId: 'note-1', title: 'Earlier', description: '', tags: '' })
      await Promise.resolve()
    })
    const failed = expect(autoSave).rejects.toThrow('Queue unavailable')
    await act(async () => {
      manualSave = result.current.handleSaveNote({ title: 'Latest', description: '', tags: '' })
      await Promise.resolve()
    })
    expect(enqueueMutation).toHaveBeenCalledTimes(1)
    await act(async () => { failQueue(new Error('Queue unavailable')); await failed; await manualSave })
    expect(enqueueMutation.mock.calls.map(([item]) => item.payload.title)).toEqual(['Earlier', 'Latest'])
    expect(params.offlineCache.saveNote).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'note-1', title: 'Latest' }))
  })

  it('does not delay another note while one note is waiting for storage', async () => {
    let finishQueue = () => {}
    const firstQueueWrite = new Promise<void>(resolve => { finishQueue = resolve })
    const enqueueMutation = jest.fn().mockReturnValueOnce(firstQueueWrite).mockResolvedValue(undefined)
    const { result } = setup({ enqueueMutation })
    let firstSave!: ReturnType<typeof result.current.handleAutoSave>
    await act(async () => {
      firstSave = result.current.handleAutoSave({ noteId: 'note-1', title: 'First', description: '', tags: '' })
      await Promise.resolve()
    })
    await act(async () => {
      await result.current.handleAutoSave({ noteId: 'note-2', title: 'Other note', description: '', tags: '' })
    })
    expect(enqueueMutation.mock.calls.map(([item]) => item.noteId)).toEqual(['note-1', 'note-2'])
    await act(async () => { finishQueue(); await firstSave })
  })

  it('gives consecutive writes distinct timestamps when the clock has not advanced', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-28T12:00:00.000Z'))
    try {
      const { result, params } = setup()
      await act(async () => {
        await result.current.handleAutoSave({ noteId: 'note-1', title: 'Earlier', description: '', tags: '' })
        await result.current.handleSaveNote({ title: 'Latest', description: '', tags: '' })
      })
      const writes = params.enqueueMutation.mock.calls.map(([item]: [{ clientUpdatedAt: string }]) => item.clientUpdatedAt)
      expect(Date.parse(writes[0])).toBeLessThan(Date.parse(writes[1]))
    } finally {
      jest.useRealTimers()
    }
  })

  it('continues after a queued timestamp for the same note when the app session restarts', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-28T12:00:00.000Z'))
    try {
      const queue: Array<{ noteId: string; clientUpdatedAt: string; status: string }> = []
      const offlineQueueRef = { current: { getQueue: jest.fn(async () => [...queue]) } }
      const enqueueMutation = jest.fn(async (item: { noteId: string; clientUpdatedAt: string }) => {
        queue.push({ ...item, status: 'pending' })
      })
      const first = setup({ offlineQueueRef, enqueueMutation })
      await act(async () => {
        await first.result.current.handleAutoSave({ noteId: 'note-1', title: 'Earlier', description: '', tags: '' })
      })
      first.unmount()
      const reopened = setup({ offlineQueueRef, enqueueMutation })
      await act(async () => {
        await reopened.result.current.handleSaveNote({ title: 'Latest', description: '', tags: '' })
      })
      expect(queue).toHaveLength(2)
      expect(Date.parse(queue[0].clientUpdatedAt)).toBeLessThan(Date.parse(queue[1].clientUpdatedAt))
    } finally {
      jest.useRealTimers()
    }
  })

  it('does not change a note timestamp because another note has a newer queued write', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-28T12:00:00.000Z'))
    try {
      const offlineQueueRef = { current: { getQueue: jest.fn().mockResolvedValue([
        { noteId: 'note-2', clientUpdatedAt: '2026-10-29T12:00:00.000Z', status: 'pending' },
      ]) } }
      const { result, params } = setup({ offlineQueueRef })
      await act(async () => {
        await result.current.handleAutoSave({ noteId: 'note-1', title: 'First', description: '', tags: '' })
      })
      expect(params.enqueueMutation.mock.calls[0][0].clientUpdatedAt).toBe('2026-10-28T12:00:00.000Z')
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('durable local saves', () => {
  it('reports a retained local copy without a premature success toast', async () => {
    jest.clearAllMocks()
    const plan = { ownerId: 'user-1', snapshots: new Map() }
    const localDeletion = { prepare: jest.fn().mockResolvedValue(plan), complete: jest.fn().mockResolvedValue(false) }
    const { result, params } = setup({ noteToDelete: makeNote(), localDeletion })
    await act(async () => { await expect(result.current.confirmDeleteNote()).resolves.toBe(false) })
    expect(params.deleteNoteMutation.mutateAsync).toHaveBeenCalledWith({ id: 'note-1', silent: true })
    expect(localDeletion.complete).toHaveBeenCalledWith('note-1', plan)
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Server accepted deletion; local cleanup needs checking.')
    expect(params.setOfflineOverlay).not.toHaveBeenCalled()
  })

  it('does not send a server delete when local data cannot be checked', async () => {
    jest.clearAllMocks()
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const localDeletion = { prepare: jest.fn().mockRejectedValue(new Error('Storage unavailable')), complete: jest.fn() }
      const { result, params } = setup({ noteToDelete: makeNote(), localDeletion })
      await act(async () => { await expect(result.current.confirmDeleteNote()).resolves.toBe(false) })
      expect(params.deleteNoteMutation.mutateAsync).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith('Could not check local data. The deletion was not sent.')
    } finally { log.mockRestore() }
  })

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
