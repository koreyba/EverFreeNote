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
})
