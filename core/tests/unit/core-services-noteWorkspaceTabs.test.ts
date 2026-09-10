import type { NoteViewModel } from '@core/types/domain'
import {
  activateWorkspaceTab,
  addWorkspaceTab,
  canAddWorkspaceTab,
  closeWorkspaceTab,
  createNoteWorkspaceState,
  findWorkspaceTabByNoteId,
  getActiveWorkspaceTab,
  hydrateNoteWorkspaceState,
  MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH,
  MAX_NOTE_WORKSPACE_TABS,
  openNoteInWorkspace,
  resetWorkspaceTabsForNotes,
  serializeNoteWorkspaceState,
  serializeNoteWorkspaceStateWithinLimit,
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

  it('guards the shared workspace tab limit in the core transition', () => {
    let state = createNoteWorkspaceState(ids('tab-0'))
    for (let index = 1; index < MAX_NOTE_WORKSPACE_TABS; index += 1) {
      state = addWorkspaceTab(state, ids(`tab-${index}`))
    }

    expect(state.tabs).toHaveLength(MAX_NOTE_WORKSPACE_TABS)
    expect(canAddWorkspaceTab(state)).toBe(false)
    expect(addWorkspaceTab(state, ids('unexpected'))).toBe(state)
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

  it('resets tabs showing deleted notes back to blank slots without changing order or activation', () => {
    let state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1')), note('note-1'))
    state = addWorkspaceTab(state, ids('tab-2'))
    state = openNoteInWorkspace(state, note('note-2'))
    state = addWorkspaceTab(state, ids('tab-3'))
    state = openNoteInWorkspace(state, note('note-3'))
    state = updateWorkspaceTab(state, 'tab-2', { draft: { title: 'Unsaved edits' }, saveState: 'dirty' })

    const reset = resetWorkspaceTabsForNotes(state, ['note-2', 'missing-note'])

    expect(reset.tabs.map((tab) => tab.id)).toEqual(['tab-1', 'tab-2', 'tab-3'])
    expect(reset.activeTabId).toBe('tab-3')
    expect(findWorkspaceTabByNoteId(reset, 'note-2')).toBeNull()
    expect(reset.tabs[1]).toMatchObject({
      id: 'tab-2',
      noteId: null,
      note: null,
      mode: 'reading',
      draft: { title: '', description: '', tags: '' },
      saveState: 'saved',
      saveError: null,
    })
    expect(reset.tabs[0]).toBe(state.tabs[0])
    expect(reset.tabs[2]).toBe(state.tabs[2])
  })

  it('returns the same state when no tab shows a deleted note', () => {
    const state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1')), note('note-1'))

    expect(resetWorkspaceTabsForNotes(state, ['other-note'])).toBe(state)
    expect(resetWorkspaceTabsForNotes(state, [])).toBe(state)
    expect(resetWorkspaceTabsForNotes(state, [''])).toBe(state)
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

    const oversized = hydrateNoteWorkspaceState(
      JSON.stringify({ version: 1, activeTabId: 'tab-1', tabs: [{ ...state.tabs[0], draft: { title: 'x'.repeat(MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) } }] }),
      ids('oversized'),
    )
    expect(oversized.tabs).toHaveLength(1)
    expect(oversized.activeTabId).toBe('oversized')
    expect(() => serializeNoteWorkspaceState({
      ...state,
      tabs: [{ ...state.tabs[0], draft: { ...state.tabs[0].draft, description: 'x'.repeat(MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) } }],
    })).toThrow('exceeds the storage limit')
  })

  it('ignores activation and updates for unknown tab IDs', () => {
    const state = createNoteWorkspaceState(ids('tab-1'))

    expect(activateWorkspaceTab(state, 'missing')).toBe(state)
    expect(updateWorkspaceTab(state, 'missing', { mode: 'reading' })).toBe(state)
    expect(findWorkspaceTabByNoteId(state, null)).toBeNull()
  })

  it('refuses to restore a workspace stamped with another account', () => {
    const owned = note('note-1')
    const state = openNoteInWorkspace(createNoteWorkspaceState(ids('owner'), 'user-1'), owned)
    const serialized = serializeNoteWorkspaceState(state)

    const sameUser = hydrateNoteWorkspaceState(serialized, ids('same'), 'user-1')
    expect(sameUser.userId).toBe('user-1')
    expect(sameUser.tabs[0].noteId).toBe('note-1')

    const otherUser = hydrateNoteWorkspaceState(serialized, ids('other'), 'user-2')
    expect(otherUser.userId).toBe('user-2')
    expect(otherUser.tabs).toHaveLength(1)
    expect(otherUser.tabs[0].noteId).toBeNull()
    expect(otherUser.tabs[0].note).toBeNull()
  })

  it('discards workspace state written before the account stamp existed', () => {
    const owned = note('note-1')
    const legacy = {
      version: 1,
      tabs: [{
        id: 'tab-legacy',
        noteId: owned.id,
        note: owned,
        mode: 'reading',
        draft: { title: owned.title, description: '', tags: '' },
        view: { scrollTop: 0 },
        saveState: 'saved',
        saveError: null,
      }],
      activeTabId: 'tab-legacy',
    }

    const hydrated = hydrateNoteWorkspaceState(legacy, ids('legacy'), 'user-1')

    expect(hydrated.tabs[0].noteId).toBeNull()
    expect(hydrated.tabs[0].note).toBeNull()
  })

  it('omits a draft that is only a copy of the note it shows', () => {
    const big = note('note-big')
    big.description = '<p>' + 'x'.repeat(50_000) + '</p>'
    const state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1'), 'user-1'), big)

    const serialized = serializeNoteWorkspaceState(state)

    // The body appears once, not once for the note and once for the draft.
    expect(serialized.split('x'.repeat(50_000)).length - 1).toBe(1)
    // ...and the round trip still yields the draft.
    expect(hydrateNoteWorkspaceState(serialized, ids('r1'), 'user-1')).toEqual(state)
  })

  it('keeps a draft that has diverged from the note', () => {
    const edited = note('note-edited')
    let state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1'), 'user-1'), edited)
    state = updateWorkspaceTab(state, state.activeTabId, {
      draft: { title: 'Locally edited' },
      saveState: 'dirty',
    })

    const restored = hydrateNoteWorkspaceState(serializeNoteWorkspaceState(state), ids('r1'), 'user-1')

    expect(restored.tabs[0].draft.title).toBe('Locally edited')
  })

  it('stores as many tabs as fit instead of losing the whole workspace', () => {
    const body = '<p>' + 'y'.repeat(20_000) + '</p>'
    let state = createNoteWorkspaceState(ids('tab-0'), 'user-1')
    state = openNoteInWorkspace(state, { ...note('note-0'), description: body })
    for (let index = 1; index < 6; index += 1) {
      state = addWorkspaceTab(state, ids(`tab-${index}`))
      state = openNoteInWorkspace(state, { ...note(`note-${index}`), description: body })
    }
    // Mark one background tab as carrying unsaved work.
    state = updateWorkspaceTab(state, state.tabs[1].id, { saveState: 'dirty' })

    // A budget that only fits a couple of these tabs.
    const result = serializeNoteWorkspaceStateWithinLimit(state, 60_000)

    expect(result).not.toBeNull()
    expect(result!.droppedTabIds.length).toBeGreaterThan(0)
    expect(result!.serialized.length).toBeLessThanOrEqual(60_000)
    // The active tab and the unsaved one survive; saved tabs are given up first.
    expect(result!.droppedTabIds).not.toContain(state.activeTabId)
    expect(result!.droppedTabIds).not.toContain(state.tabs[1].id)
  })

  it('reports failure only when even the active tab cannot fit', () => {
    const huge = { ...note('note-huge'), description: '<p>' + 'z'.repeat(5_000) + '</p>' }
    const state = openNoteInWorkspace(createNoteWorkspaceState(ids('tab-1'), 'user-1'), huge)

    expect(serializeNoteWorkspaceStateWithinLimit(state, 500)).toBeNull()
  })
})
