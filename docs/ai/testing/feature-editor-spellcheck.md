---
phase: testing
title: Testing Strategy - Editor Spellcheck
description: Testing checklist and verification plan for editor spellcheck
---

# Testing Strategy - Editor Spellcheck

## Test Coverage Goals
- Unit tests for the new `PreferencesPanel` component verifying mount loading, saving to local storage when toggling, and initial default states.
- Unit/integration verification that the rich-text editor components receive the spellcheck attribute in their ProseMirror DOM container.

## Unit Tests

### `PreferencesPanel` (New Component Tests)
- [ ] Render toggle in Preferences tab.
- [ ] Initial state should read `true` if `localStorage` has no value.
- [ ] Toggle to `false` and verify `localStorage.getItem("editor_spellcheck_enabled")` is `"false"`.
- [ ] Toggle back to `true` and verify storage item is `"true"`.

### `RichTextEditor` / `RichTextEditorWebView` Tests
- [ ] Verify editor initializes with default `spellcheck="true"`.
- [ ] Mock `localStorage.getItem("editor_spellcheck_enabled")` returning `"false"` and verify the ProseMirror div container has `spellcheck="false"`.

## Manual Verification
- Go to `/settings?tab=preferences`.
- Verify the layout matches other settings tabs.
- Toggle "Spellcheck" off.
- Go back to notes editor. Verify spelling errors (e.g., typing gibberish like `asdasdasdfasdf`) do not show red underlines.
- Go to settings, toggle "Spellcheck" on.
- Return to notes editor, verify spelling errors show red underlines.
