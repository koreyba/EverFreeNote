import {
  addWorkspaceTab, createNoteWorkspaceState, hydrateNoteWorkspaceState,
  reorderWorkspaceTab, serializeNoteWorkspaceState,
} from '@core/services/noteWorkspaceTabs'

function workspace() {
  let state = createNoteWorkspaceState(() => 'one', 'owner')
  state = addWorkspaceTab(state, () => 'two')
  state = addWorkspaceTab(state, () => 'three')
  return {
    ...state,
    activeTabId: 'two',
    split: { leftTabId: 'one', rightTabId: 'two', focusedTabId: 'two' },
    tabs: state.tabs.map(tab => tab.id === 'two' ? {
      ...tab, mode: 'editing' as const, saveState: 'dirty' as const,
      draft: { title: 'Unsaved draft', description: '<p>Keep this</p>', tags: 'work' },
      view: { scrollTop: 180, titleSelection: { start: 2, end: 5 } },
    } : tab),
  }
}

describe('workspace tab ordering', () => {
  it('moves a tab before a neighbor while preserving focus, split assignments and live sessions', () => {
    const state = workspace()
    const next = reorderWorkspaceTab(state, 'three', 'one', 'before')
    expect(next.tabs.map(tab => tab.id)).toEqual(['three', 'one', 'two'])
    expect(next.activeTabId).toBe('two')
    expect(next.split).toBe(state.split)
    expect(next.tabs[2]).toBe(state.tabs[1])
    expect(next.tabs[0]).toBe(state.tabs[2])
    expect(state.tabs.map(tab => tab.id)).toEqual(['one', 'two', 'three'])
  })

  it('moves a tab after its target and persists the new order with the original active draft', () => {
    const next = reorderWorkspaceTab(workspace(), 'one', 'three', 'after')
    const restored = hydrateNoteWorkspaceState(serializeNoteWorkspaceState(next), () => 'fallback', 'owner')
    expect(restored.tabs.map(tab => tab.id)).toEqual(['two', 'three', 'one'])
    expect(restored.activeTabId).toBe('two')
    expect(restored.tabs[0].draft.title).toBe('Unsaved draft')
    expect(restored.split).toEqual(next.split)
  })

  it('ignores missing tabs, self drops and positions that already match the order', () => {
    const state = workspace()
    expect(reorderWorkspaceTab(state, 'missing', 'one', 'before')).toBe(state)
    expect(reorderWorkspaceTab(state, 'one', 'missing', 'after')).toBe(state)
    expect(reorderWorkspaceTab(state, 'two', 'two', 'before')).toBe(state)
    expect(reorderWorkspaceTab(state, 'one', 'two', 'before')).toBe(state)
    expect(reorderWorkspaceTab(state, 'two', 'one', 'after')).toBe(state)
  })
})
