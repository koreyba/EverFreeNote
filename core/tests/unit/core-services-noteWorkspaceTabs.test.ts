import type { NoteViewModel } from '@core/types/domain'
import {
  activateWorkspaceTab,
  addWorkspaceTab,
  closeWorkspaceTab,
  createNoteWorkspaceState,
  findWorkspaceTabByNoteId,
  getActiveWorkspaceTab,
  hydrateNoteWorkspaceState,
  openNoteInWorkspace,
  serializeNoteWorkspaceState,
  updateWorkspaceTab,
} from '@core/services/noteWorkspaceTabs'

const note = (id: string, title = id): NoteViewModel => ({
  id,
  title,
  description: `<p>${title}</p>`,
  tags: ['work'],
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  user_id: 'user-1',
})

const ids = (...values: string[]) => {
  let index = 0
  return () => values[index++] ?? `generated-${index}`
}

describe('note workspace tab state', () => {
  it('creates one blank active landing tab', () => {
    const state = createNoteWorkspaceState(ids('tab-1'))

    expect(state.tabs).toHaveLength(1)
    expect(getActiveWorkspaceTab(state)).toMatchObject({
      id: 'tab-1',
      noteId: null,
      mode: 'reading',
      saveState: 'saved',
    })
  })

  it('adds and activates a blank tab while preserving the first tab', () => {
    const first = createNoteWorkspaceState(ids('tab-1'))
    const state = addWorkspaceTab(first, ids('tab-2'))

    expect(state.tabs.map((tab) => tab.id)).toEqual(['tab-1', 'tab-2'])
    expect(state.activeTabId).toBe('tab-2')
    expect(state.tabs[0]).toBe(first.tabs[0])
  })

  it('replaces the active tab when opening a new note', () => {
    const first = createNoteWorkspaceState(ids('tab-1'))
    const state = openNoteInWorkspace(first, note('note-1', 'First'))

    expect(state.tabs).toHaveLength(1)
    expect(getActiveWorkspaceTab(state)).toMatchObject({
      id: 'tab-1',
      noteId: 'note-1',
      mode: 'reading',
      draft: { title: 'First', description: '<p>First</p>', tags: 'work' },
    })
  })

  it('activates an existing note tab instead of creating a duplicate', () => {
    let state = createNoteWorkspaceState(ids('tab-1'))
    state = openNoteInWorkspace(state, note('note-1'))
    state = addWorkspaceTab(state, ids('tab-2'))
    const deduplicated = openNoteInWorkspace(state, note('note-1'))

    expect(deduplicated.tabs).toHaveLength(2)
    expect(deduplicated.activeTabId).toBe('tab-1')
    expect(findWorkspaceTabByNoteId(deduplicated, 'note-1')?.id).toBe('tab-1')
  })

  it('updates draft, view, and failed-save state without changing tab identity', () => {
    const state = createNoteWorkspaceState(ids('tab-1'))
    const updated = updateWorkspaceTab(state, 'tab-1', {
      draft: { title: 'Draft title' },
      view: { scrollTop: 240, editorSelection: { from: 3, to: 7 } },
      saveState: 'error',
      saveError: 'network unavailable',
    })

    expect(getActiveWorkspaceTab(updated)).toMatchObject({
      id: 'tab-1',
      draft: { title: 'Draft title', description: '', tags: '' },
      view: { scrollTop: 240, editorSelection: { from: 3, to: 7 } },
      saveState: 'error',
      saveError: 'network unavailable',
    })
  })

  it('closes the active tab and prefers the right neighbor, then the left neighbor', () => {
    let state = createNoteWorkspaceState(ids('tab-1'))
    state = addWorkspaceTab(state, ids('tab-2'))
    state = addWorkspaceTab(state, ids('tab-3'))

    const afterMiddleClose = closeWorkspaceTab(activateWorkspaceTab(state, 'tab-2'), 'tab-2', ids('replacement'))
    expect(afterMiddleClose.tabs.map((tab) => tab.id)).toEqual(['tab-1', 'tab-3'])
    expect(afterMiddleClose.activeTabId).toBe('tab-3')

    const afterRightmostClose = closeWorkspaceTab(activateWorkspaceTab(afterMiddleClose, 'tab-3'), 'tab-3', ids('replacement'))
    expect(afterRightmostClose.activeTabId).toBe('tab-1')
  })

  it('keeps one blank active tab when the last tab closes', () => {
    const state = createNoteWorkspaceState(ids('tab-1'))
    const closed = closeWorkspaceTab(state, 'tab-1', ids('tab-replacement'))

    expect(closed.tabs).toHaveLength(1)
    expect(getActiveWorkspaceTab(closed)).toMatchObject({ id: 'tab-replacement', noteId: null })
  })

  it('round-trips valid state and rejects malformed or duplicate persisted tabs', () => {
    let state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1')), note('note-1'))
    state = addWorkspaceTab(state, ids('tab-2'))
    state = updateWorkspaceTab(state, 'tab-2', { note: note('note-2'), mode: 'editing' })

    const restored = hydrateNoteWorkspaceState(serializeNoteWorkspaceState(state), ids('restored'))
    expect(restored).toEqual(state)

    const duplicate = hydrateNoteWorkspaceState({
      version: 1,
      activeTabId: 'tab-1',
      tabs: [
        { ...state.tabs[0] },
        { ...state.tabs[1], id: 'tab-3', noteId: 'note-1' },
      ],
    }, ids('restored'))
    expect(duplicate.tabs.map((tab) => tab.noteId)).toEqual(['note-1', 'note-2'])
    expect(duplicate.tabs.filter((tab) => tab.noteId === 'note-1')).toHaveLength(1)

    const malformed = hydrateNoteWorkspaceState('{not-json', ids('fallback'))
    expect(malformed.tabs).toHaveLength(1)
    expect(malformed.activeTabId).toBe('fallback')
  })

  it('ignores activation and updates for unknown tab IDs', () => {
    const state = createNoteWorkspaceState(ids('tab-1'))

    expect(activateWorkspaceTab(state, 'missing')).toBe(state)
    expect(updateWorkspaceTab(state, 'missing', { mode: 'reading' })).toBe(state)
    expect(findWorkspaceTabByNoteId(state, null)).toBeNull()
  })
})
