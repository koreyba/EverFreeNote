import {
  clearNoteWorkspaceState,
  NOTE_WORKSPACE_STORAGE_KEY,
  readNoteWorkspaceState,
  writeNoteWorkspaceState,
} from '@ui/web/lib/noteWorkspaceStorage'
import {
  createNoteWorkspaceState,
  openNoteInWorkspace,
} from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'

const note: NoteViewModel = {
  id: 'note-1',
  title: 'Persisted note',
  description: '<p>Draft</p>',
  tags: ['work'],
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  user_id: 'user-1',
}

describe('note workspace session storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('round-trips workspace state through the versioned session key', () => {
    const state = openNoteInWorkspace(createNoteWorkspaceState(() => 'tab-1'), note)

    expect(writeNoteWorkspaceState(state).persisted).toBe(true)
    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).toContain('note-1')
    expect(readNoteWorkspaceState()).toEqual(state)
  })

  it('uses a blank workspace when stored JSON is invalid', () => {
    window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, '{invalid')

    const state = readNoteWorkspaceState({ storage: window.sessionStorage, idFactory: () => 'fallback-tab' })

    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe('fallback-tab')
    expect(state.tabs[0].noteId).toBeNull()
  })

  it('keeps the in-memory contract when storage access throws', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
      removeItem: () => { throw new Error('blocked') },
    } as unknown as Storage
    const state = createNoteWorkspaceState(() => 'tab-1')

    expect(readNoteWorkspaceState({ storage: throwingStorage, idFactory: () => 'fallback-tab' }).activeTabId).toBe('fallback-tab')
    expect(writeNoteWorkspaceState(state, throwingStorage).persisted).toBe(false)
    expect(() => clearNoteWorkspaceState(throwingStorage)).not.toThrow()
  })

  it('clears only the workspace key', () => {
    window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, 'state')
    window.sessionStorage.setItem('unrelated', 'keep')

    clearNoteWorkspaceState()

    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem('unrelated')).toBe('keep')
  })

  it('does not restore another account\'s workspace from the shared session key', () => {
    const previous = openNoteInWorkspace(createNoteWorkspaceState(() => 'tab-1', 'user-1'), note)
    writeNoteWorkspaceState(previous)

    const restoredForOwner = readNoteWorkspaceState({ userId: 'user-1' })
    expect(restoredForOwner.tabs[0].noteId).toBe(note.id)

    const restoredForOther = readNoteWorkspaceState({ userId: 'user-2' })
    expect(restoredForOther.userId).toBe('user-2')
    expect(restoredForOther.tabs).toHaveLength(1)
    expect(restoredForOther.tabs[0].noteId).toBeNull()
    expect(restoredForOther.tabs[0].note).toBeNull()
  })
})
