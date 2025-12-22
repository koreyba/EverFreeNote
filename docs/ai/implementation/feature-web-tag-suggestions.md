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

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Tag suggestion logic:
  - Build a unique tag list from cached notes and sort alphabetically.
  - Exclude tags already selected on the current note.
  - Enforce minimum input length of 3 and limit to 3 suggestions.
  - Normalize tags for matching (trim, collapse spaces, lowercase).
- Tag input UI:
  - Render selected tags using the same chip component as read mode.
  - Keep a small text input for new tag entry and suggestions.
  - Add tags via comma or Enter only; no auto-add on blur or space.
  - Store normalized tags (trim, collapse spaces, lowercase) on edit/save; no migration.
  - Support backspace removal when the input is empty.
- Read mode:
  - Keep the existing remove handler so tag deletion remains available.

### Patterns & Best Practices
- Memoize suggestion lists to avoid recalculating on each keystroke.
- Keep the source of truth for tags in the editor component and emit a comma-separated string for existing save logic.
- Keep UI behavior consistent with existing `InteractiveTag` styles.

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
