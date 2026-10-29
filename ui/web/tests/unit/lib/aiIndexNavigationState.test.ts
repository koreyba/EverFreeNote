import {
  clearAIIndexPendingNoteState,
  clearAIIndexViewState,
  clearActiveSettingsNoteReturnPath,
  consumeAIIndexPendingNoteState,
  consumeAIIndexViewState,
  consumeActiveSettingsNoteReturnPath,
  readAIIndexViewState,
  readActiveSettingsNoteReturnPath,
  saveAIIndexPendingNoteState,
  saveAIIndexViewState,
  saveActiveSettingsNoteReturnPath,
} from "@ui/web/lib/aiIndexNavigationState"

describe("aiIndexNavigationState", () => {
  beforeEach(() => {
    globalThis.window.sessionStorage.clear()
    clearAIIndexPendingNoteState()
    clearAIIndexViewState()
    clearActiveSettingsNoteReturnPath()
  })

  it("persists and consumes the AI Index view state snapshot", () => {
    expect(saveAIIndexViewState({
      filter: "outdated",
      searchDraft: "hello",
      searchQuery: "hello",
      scrollOffset: 248,
    }, 'user-a')).toBe(true)

    expect(readAIIndexViewState('user-a')).toEqual({
      filter: "outdated",
      searchDraft: "hello",
      searchQuery: "hello",
      scrollOffset: 248,
    })

    expect(consumeAIIndexViewState('user-a')).toEqual({
      filter: "outdated",
      searchDraft: "hello",
      searchQuery: "hello",
      scrollOffset: 248,
    })
    expect(readAIIndexViewState('user-a')).toBeNull()
  })

  it("stores only sanitized note return paths", () => {
    expect(saveAIIndexPendingNoteState({
      noteId: "note-1",
      returnPath: "/settings?tab=ai-index",
    }, 'user-a')).toBe(true)
    expect(saveActiveSettingsNoteReturnPath("/settings?tab=ai-index", 'user-a')).toBe(true)

    expect(consumeAIIndexPendingNoteState('user-a')).toEqual({
      noteId: "note-1",
      returnPath: "/settings?tab=ai-index",
    })
    expect(readActiveSettingsNoteReturnPath('user-a')).toBe("/settings?tab=ai-index")
    expect(consumeActiveSettingsNoteReturnPath('user-a')).toBe("/settings?tab=ai-index")

    expect(saveAIIndexPendingNoteState({
      noteId: "note-2",
      returnPath: "https://example.com/evil",
    }, 'user-a')).toBe(false)
    expect(saveActiveSettingsNoteReturnPath("https://example.com/evil", 'user-a')).toBe(false)
  })

  it('does not restore another account’s AI search or pending note', () => {
    expect(saveAIIndexViewState({ filter: 'all', searchDraft: 'private query', searchQuery: 'private query', scrollOffset: 0 }, 'user-a')).toBe(true)
    expect(saveAIIndexPendingNoteState({ noteId: 'private-note', returnPath: '/settings?tab=ai-index' }, 'user-a')).toBe(true)
    expect(readAIIndexViewState('user-b')).toBeNull()
    expect(consumeAIIndexPendingNoteState('user-b')).toBeNull()
  })
})
