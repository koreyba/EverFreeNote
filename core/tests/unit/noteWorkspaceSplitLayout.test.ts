import type { NoteViewModel } from '@core/types/domain'
import {
  addWorkspaceTab,
  createNoteWorkspaceState,
  hydrateNoteWorkspaceState,
  openNoteInWorkspace,
  openWorkspaceNoteInPane,
  MAX_NOTE_WORKSPACE_TABS,
  placeWorkspaceTabInPane,
  serializeNoteWorkspaceState,
  serializeNoteWorkspaceStateWithinLimit,
} from '@core/services/noteWorkspaceTabs'

const note = (id: string, description = `<p>${id}</p>`): NoteViewModel => ({
  id, title: id, description, tags: [], user_id: 'owner-a',
  created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z',
})

function workspace() {
  let state = openNoteInWorkspace(createNoteWorkspaceState(() => 'left', 'owner-a'), note('one'))
  state = addWorkspaceTab(state, () => 'right')
  return openNoteInWorkspace(state, note('two'))
}

const layout = { leftTabId: 'left', rightTabId: 'right', focusedTabId: 'right' }

describe('persisted note workspace split layout', () => {
  it('opens a new dropped note in a new tab while retaining both existing sessions', () => {
    const state = { ...workspace(), split: layout }
    const next = openWorkspaceNoteInPane(state, note('three'), 'left', () => 'third')
    expect(next.split).toEqual({ leftTabId: 'third', rightTabId: 'right', focusedTabId: 'third' })
    expect(next.tabs.map(tab => tab.noteId)).toEqual(['one', 'two', 'three'])
    expect(next.tabs[0]).toBe(state.tabs[0])
  })

  it('deduplicates a dropped note by moving its existing editing session', () => {
    const state = { ...workspace(), split: layout }
    state.tabs[0] = { ...state.tabs[0], mode: 'editing', saveState: 'dirty', draft: { title: 'Unfinished', description: '<p>Draft</p>', tags: '' } }
    const next = openWorkspaceNoteInPane(state, note('one'), 'right', () => 'unused')
    expect(next.tabs).toBe(state.tabs)
    expect(next.tabs[0].draft.title).toBe('Unfinished')
    expect(next.split?.rightTabId).toBe('left')
  })

  it('does not create orphan tabs when a drop target disappears or the tab limit is reached', () => {
    let state = { ...workspace(), split: layout }
    expect(openWorkspaceNoteInPane(state, note('three'), 'missing', () => 'unused')).toBe(state)
    for (let index = 2; index < MAX_NOTE_WORKSPACE_TABS; index++) state = { ...addWorkspaceTab(state, () => `spare-${index}`), split: layout }
    expect(openWorkspaceNoteInPane(state, note('three'), 'left', () => 'unused')).toBe(state)
    expect(openWorkspaceNoteInPane(state, note('one'), 'right').split?.rightTabId).toBe('left')
  })
  it('swaps the two visible tabs when a tab is dropped onto its opposite pane', () => {
    const state = { ...workspace(), split: layout }
    const next = placeWorkspaceTabInPane(state, 'left', 'right')
    expect(next.split).toEqual({ leftTabId: 'right', rightTabId: 'left', focusedTabId: 'left' })
    expect(next.activeTabId).toBe('left')
    expect(next.tabs).toBe(state.tabs)
  })

  it('places an already-open third tab in the requested pane without closing the displaced tab', () => {
    let state = addWorkspaceTab(workspace(), () => 'third')
    state = openNoteInWorkspace(state, note('three'))
    state = { ...state, split: layout }
    const next = placeWorkspaceTabInPane(state, 'third', 'left')
    expect(next.split).toEqual({ leftTabId: 'third', rightTabId: 'right', focusedTabId: 'third' })
    expect(next.tabs.map(tab => tab.id)).toEqual(['left', 'right', 'third'])
  })

  it('ignores drops onto a stale pane or of a tab that no longer exists', () => {
    const state = { ...workspace(), split: layout }
    expect(placeWorkspaceTabInPane(state, 'missing', 'left')).toBe(state)
    expect(placeWorkspaceTabInPane(state, 'left', 'missing')).toBe(state)
    expect(placeWorkspaceTabInPane(workspace(), 'left', 'right').split).toBeUndefined()
  })
  it('round-trips the owner-scoped pane IDs while preserving tabs and active note', () => {
    const state = { ...workspace(), split: layout }
    const restored = hydrateNoteWorkspaceState(serializeNoteWorkspaceState(state), () => 'fallback', 'owner-a')
    expect(restored).toEqual(state)
    expect(hydrateNoteWorkspaceState(serializeNoteWorkspaceState(state), () => 'fallback', 'owner-b').split).toBeUndefined()
  })

  it('accepts older v1 snapshots without layout and rejects malformed, absent, or duplicate panes', () => {
    const state = workspace()
    expect(hydrateNoteWorkspaceState(state, () => 'fallback', 'owner-a').split).toBeUndefined()
    for (const invalid of [
      { ...layout, rightTabId: 'missing' },
      { ...layout, rightTabId: 'left' },
      { ...layout, focusedTabId: 'missing' },
      { ...layout, leftTabId: '' },
      { ...layout, rightTabId: 10 },
    ]) {
      expect(hydrateNoteWorkspaceState({ ...state, split: invalid }, () => 'fallback', 'owner-a').split).toBeUndefined()
    }
    const duplicateNote = { ...state, tabs: [state.tabs[0], { ...state.tabs[1], note: state.tabs[0].note, noteId: 'one' }], split: layout }
    expect(hydrateNoteWorkspaceState(duplicateNote, () => 'fallback', 'owner-a').split).toBeUndefined()
  })

  it('allows one blank landing pane and drops layout if the storage budget evicts a pane', () => {
    let state = openNoteInWorkspace(createNoteWorkspaceState(() => 'left', 'owner-a'), note('one', 'x'.repeat(20_000)))
    state = addWorkspaceTab(state, () => 'right')
    const withLayout = { ...state, split: layout }
    expect(hydrateNoteWorkspaceState(serializeNoteWorkspaceState(withLayout), () => 'fallback', 'owner-a').split).toEqual(layout)
    const limited = serializeNoteWorkspaceStateWithinLimit(withLayout, 1_000)
    expect(limited?.droppedTabIds).toContain('left')
    expect(hydrateNoteWorkspaceState(limited!.serialized, () => 'fallback', 'owner-a').split).toBeUndefined()
  })
})
