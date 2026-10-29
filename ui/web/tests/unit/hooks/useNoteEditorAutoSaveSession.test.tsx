import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { useNoteEditorAutoSave } from '@ui/web/hooks/useNoteEditorAutoSave'

jest.mock('sonner', () => ({ toast: { error: jest.fn(), dismiss: jest.fn() } }))

describe('autosave notifications across account changes', () => {
  beforeEach(() => jest.clearAllMocks())

  const setup = (onAutoSave: () => Promise<void>, shouldFlushOnUnmount: () => boolean) => renderHook(() => useNoteEditorAutoSave({
    noteId: 'note-a', initialTitle: 'Saved', initialDescription: '', initialTags: '', autosaveDelayMs: 500,
    onAutoSave, getFormData: () => ({ title: 'Edited', description: '', tags: '' }),
    cancelDebouncedTagQuery: () => {}, shouldFlushOnUnmount,
  }))

  it('does not publish an old owner failure after the session changed', async () => {
    let reject!: (reason: Error) => void
    const held = new Promise<void>((_resolve, fail) => { reject = fail })
    let changed = false
    const { result } = setup(() => held, () => changed)
    act(() => result.current.scheduleAutoSave())
    let pending!: Promise<void>
    await act(async () => { pending = result.current.flushPendingSave(); await Promise.resolve() })
    changed = true
    await act(async () => { reject(new Error('Offline')); await expect(pending).rejects.toThrow('Offline') })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('still reports a failure to the owner in their current session', async () => {
    const { result } = setup(async () => { throw new Error('Offline') }, () => false)
    act(() => result.current.scheduleAutoSave())
    await act(async () => { await expect(result.current.flushPendingSave()).rejects.toThrow('Offline') })
    expect(toast.error).toHaveBeenCalledWith('Auto-save failed. Your changes will retry.', { id: 'note-autosave-failed' })
  })

  it('does not dismiss a new session notification when an old save succeeds', async () => {
    let resolve!: () => void
    const held = new Promise<void>((done) => { resolve = done })
    let changed = false
    const { result } = setup(() => held, () => changed)
    act(() => result.current.scheduleAutoSave())
    let pending!: Promise<void>
    await act(async () => { pending = result.current.flushPendingSave(); await Promise.resolve() })
    changed = true
    await act(async () => { resolve(); await pending })
    expect(toast.dismiss).not.toHaveBeenCalled()
  })

  it('does not enqueue a second snapshot after the editor unmounts during a flush', async () => {
    let resolve!: () => void
    const held = new Promise<void>(done => { resolve = done })
    let draft = { title: 'Edited', description: '', tags: '' }
    const onAutoSave = jest.fn().mockImplementationOnce(() => held).mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useNoteEditorAutoSave({
      noteId: 'note-a', initialTitle: 'Saved', initialDescription: '', initialTags: '', autosaveDelayMs: 500,
      onAutoSave, getFormData: () => draft, cancelDebouncedTagQuery: () => {}, shouldFlushOnUnmount: () => false,
    }))
    let pending!: Promise<void>
    await act(async () => { pending = result.current.flushPendingSave(); await Promise.resolve() })
    draft = { ...draft, tags: 'late' }
    unmount()
    await act(async () => { resolve(); await pending })
    expect(onAutoSave).toHaveBeenCalledTimes(1)
  })

  it('does not enqueue old owner edits into a changed account after a slow flush', async () => {
    let resolve!: () => void
    const held = new Promise<void>(done => { resolve = done })
    let changed = false
    let draft = { title: 'Edited', description: '', tags: '' }
    const onAutoSave = jest.fn().mockImplementationOnce(() => held).mockResolvedValue(undefined)
    const { result } = renderHook(() => useNoteEditorAutoSave({
      noteId: 'note-a', initialTitle: 'Saved', initialDescription: '', initialTags: '', autosaveDelayMs: 500,
      onAutoSave, getFormData: () => draft, cancelDebouncedTagQuery: () => {}, shouldFlushOnUnmount: () => changed,
    }))
    let pending!: Promise<void>
    await act(async () => { pending = result.current.flushPendingSave(); await Promise.resolve() })
    draft = { ...draft, tags: 'old-owner-draft' }
    changed = true
    await act(async () => { resolve(); await pending })
    expect(onAutoSave).toHaveBeenCalledTimes(1)
  })

  it('does not replay a late snapshot into another note after a real note switch', async () => {
    let resolve!: () => void
    const held = new Promise<void>(done => { resolve = done })
    let draft = { title: 'Edited A', description: '', tags: '' }
    const onAutoSave = jest.fn().mockImplementationOnce(() => held).mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ noteId }) => useNoteEditorAutoSave({
      noteId, initialTitle: noteId === 'note-a' ? 'Saved A' : 'Saved B', initialDescription: '', initialTags: '', autosaveDelayMs: 500,
      onAutoSave, getFormData: () => draft, cancelDebouncedTagQuery: () => {}, shouldFlushOnUnmount: () => false,
    }), { initialProps: { noteId: 'note-a' } })
    let pending!: Promise<void>
    await act(async () => { pending = result.current.flushPendingSave(); await Promise.resolve() })
    draft = { title: 'Edited B', description: '', tags: 'new-note' }
    rerender({ noteId: 'note-b' })
    await act(async () => { resolve(); await pending })
    expect(onAutoSave).toHaveBeenCalledTimes(1)
    expect(onAutoSave.mock.calls[0][0].noteId).toBe('note-a')
  })
})
