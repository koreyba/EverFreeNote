---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- No new dependencies required; use existing UI component primitives.
- Work in `ui/web` only; reuse existing hooks and note save flows.

## Code Structure
**How is the code organized?**

- `ui/web/components/features/notes/NoteEditor.tsx`: main editor screen.
- `ui/web/components/features/notes/NoteView.tsx`: read mode view.
- `ui/web/components/InteractiveTag.tsx`: chip rendering with optional remove icon.
- `ui/web/hooks/useTagSuggestions.ts`: new hook for tag suggestions (cache-derived).
- `ui/web/lib/tags.ts`: tag normalization and parsing helpers.
- `ui/web/components/features/notes/NotesShell.tsx`: passes normalized available tags to the editor.
- `ui/web/hooks/useNoteAppController.ts`: normalizes tags on save/autosave.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Tag suggestion logic:
  - Build a unique tag list from cached notes and sort alphabetically.
  - Exclude tags already selected on the current note.
  - Enforce minimum input length of 3 and limit to 3 suggestions.
  - Normalize tags for matching (trim, collapse spaces, lowercase).
  - Perform instant case-insensitive prefix matching without artificial debounce delays.
- Tag input UI:
  - Render selected tags using chip UI with removal control.
  - Keep an inline text input field active for tag entry and suggestions.
  - Keyboard navigation: ArrowDown/ArrowUp to highlight suggestions, Enter/Tab to select highlighted suggestion or commit typed tag.
  - Add tags via comma or Enter.
  - Commit pending tags on save, leave, or blur.
  - Store normalized tags (trim, collapse spaces, lowercase) on edit/save.
  - Require double backspace when input is empty to delete the last tag chip (first backspace arms tag with red outline).
  - Do NOT trigger autosave on tag additions or removals (tags are saved when manual save, note switch, or title/body edits occur).
  - Always render remove controls on mobile viewports (`opacity-100` on mobile).
- Read mode:
  - Retain existing remove handler in read mode (`NoteView`).

### Patterns & Best Practices
- Memoize suggestion lists using `useMemo` in `useTagSuggestions.ts`.
- Keep the source of truth for tags in the editor state and format as a clean string for save operations.
- Keep UI behavior consistent with existing `InteractiveTag` styles.
- Ensure remove icons are always visible on mobile viewports.

## Integration Points
**How do pieces connect?**

- `NoteEditor` should emit updated tags through `onAutoSave` and `onSave` in the same format as today.
- `NoteView` continues to call `onTagClick` for filtering and keeps `onRemove`.

## Error Handling
**How do we handle failures?**

- Use existing save error handling in `NoteEditor` and mutations; no new error surface expected.

## Performance Considerations
**How do we keep it fast?**

- Derive tag suggestions from the current cache and memoize with `useMemo`.
- Avoid rendering suggestions unless the threshold is met.

## Security Notes
**What security measures are in place?**

- No new security concerns; tags are user-generated strings already handled by existing flows.
