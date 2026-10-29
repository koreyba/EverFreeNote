import type { NoteViewModel } from '@core/types/domain'
import {
  addWorkspaceTab,
  createNoteWorkspaceState,
  hydrateNoteWorkspaceState,
  openNoteInWorkspace,
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
