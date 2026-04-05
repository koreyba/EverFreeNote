---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Work from the existing repository branch that already contains the in-progress autosave session fix.
- Validate `docs/ai` with `npx ai-devkit@latest lint` before continuing implementation.

## Code Structure
**How is the code organized?**

- Shared session logic: `core/utils/noteAutosaveSession.ts`
- Shared debounce utility: `core/utils/debouncedLatest.ts`
- Mobile editor integration: `ui/mobile/app/note/[id].tsx`
- Tests:
  - `core/tests/unit/noteAutosaveSession.test.ts`
  - `core/tests/unit/core-utils-debouncedLatest.test.ts`
  - `ui/mobile/tests/integration/noteEditorScreen.test.tsx`

## Implementation Notes
**Key technical details to remember:**

- Use field-level reconcile for same-note refreshes; do not decide hydration with a whole-snapshot equality shortcut.
- Accepted baseline and current draft are separate concepts.
- `dirty` means `draft[field] !== baseline[field]` for that field.
- Same-note refreshes should rebase the debouncer baseline instead of resetting the whole autosave session.
- For mobile `description`, apply external clean updates through `EditorWebViewHandle.setContent`.
- Reuse the shared autosave session logic in both mobile and web; only the binding layer should remain client-specific.

## Integration Points
**How do pieces connect?**

- Query refresh -> shared reconcile helper -> mobile field bindings + debouncer rebase -> pending autosave -> mutation -> cache refresh

## Error Handling
**How do we handle failures?**

- Preserve dirty local fields when incoming data conflicts.
- Avoid dropping pending local work when baseline advances.

## Performance Considerations
**How do we keep it fast?**

- Reconcile only tracked fields (`title`, `description`, `tags`).
- Do not remount the editor for same-note refreshes.

## Security Notes
**What security measures are in place?**

- No new auth or network behavior; writes continue through the existing note mutation flow.
