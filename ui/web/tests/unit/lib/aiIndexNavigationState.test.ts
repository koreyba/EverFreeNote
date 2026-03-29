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
    window.sessionStorage.clear()
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
    })).toBe(true)

    expect(readAIIndexViewState()).toEqual({
      filter: "outdated",
      searchDraft: "hello",
      searchQuery: "hello",
      scrollOffset: 248,
    })

    expect(consumeAIIndexViewState()).toEqual({
      filter: "outdated",
      searchDraft: "hello",
      searchQuery: "hello",
      scrollOffset: 248,
    })
    expect(readAIIndexViewState()).toBeNull()
  })

  it("stores only sanitized note return paths", () => {
    expect(saveAIIndexPendingNoteState({
      noteId: "note-1",
      returnPath: "/settings?tab=ai-index",
    })).toBe(true)
    expect(saveActiveSettingsNoteReturnPath("/settings?tab=ai-index")).toBe(true)

    expect(consumeAIIndexPendingNoteState()).toEqual({
      noteId: "note-1",
      returnPath: "/settings?tab=ai-index",
    })
    expect(readActiveSettingsNoteReturnPath()).toBe("/settings?tab=ai-index")
    expect(consumeActiveSettingsNoteReturnPath()).toBe("/settings?tab=ai-index")

    expect(saveAIIndexPendingNoteState({
      noteId: "note-2",
      returnPath: "https://example.com/evil",
    })).toBe(false)
    expect(saveActiveSettingsNoteReturnPath("https://example.com/evil")).toBe(false)
  })
})
