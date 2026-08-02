---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup

- Worktree: use the Harness-managed worktree under the Worktree root configured in Harness settings; never create one inside the project checkout.
- Root dependencies: `npm ci`.
- Mobile dependencies: `npm --prefix ui/mobile ci`.
- Fast validation: `npm run type-check` and `npx eslint . --max-warnings=0`.
- Focused test commands must use the project's Allure agent-mode wrapper when test evidence is collected.

## Code Structure

```text
core/services/noteWorkspaceTabs.ts
ui/web/lib/noteWorkspaceStorage.ts
ui/web/hooks/useNoteWorkspaceTabs.ts
ui/web/components/features/notes/NotesTabStrip.tsx
ui/web/components/features/notes/MobileNotesTabMenu.tsx
ui/web/hooks/useNoteAppController.ts
ui/web/components/features/notes/NotesShell.tsx
ui/web/components/features/notes/NoteEditor.tsx
ui/web/components/RichTextEditor.tsx
ui/web/components/features/notes/NoteView.tsx
```

## Implementation Notes

### Core features

- Keep reducer transitions pure and make invalid states impossible through normalization.
- Use an injected ID factory in reducer tests; production uses `crypto.randomUUID` with a safe fallback.
- Use a deterministic initial tab ID for the server/client first render, then replace it with the hydrated session workspace.
- Bound serialized workspace state and fall back to a blank tab when a persisted snapshot is malformed or exceeds the storage limit.
- Hydrate once, then persist state changes through a guarded storage adapter.
- Capture the current editor before unmount, flush autosave first, and then apply tab transitions.
- Use the active tab's draft as editor initial content; never use a server refresh to overwrite a dirty local field without existing reconciliation rules.
- Keep tab indicators derived from explicit per-tab save state rather than global UI assumptions.

### Patterns & Best Practices

- Preserve the existing `NoteAppController` public return shape where possible; add tab-specific fields instead of renaming existing handlers.
- Keep all open-note entry points routed through one controller function.
- Do not add direct Supabase calls to tab UI or storage.
- Use `sessionStorage` only through the adapter and never read/write it during server rendering.
- Keep accessibility labels stable so component tests can target behavior rather than CSS.

## Integration Points

- `useNoteEditorAutoSave` remains responsible for debouncing and flush; `useNoteSaveHandlers` remains responsible for online/offline writes.
- `NoteEditorHandle` gains capture/restore methods without exposing TipTap internals to the controller.
- `NoteView` reports reading scroll position to the active tab.
- `NotesShell` renders the desktop strip in the editor and keeps `MobileNotesTabMenu` in a shared mobile header above both the note list and editor. Creating a blank mobile tab closes the menu and returns to the note list; the next note selection fills that active slot.

## Error Handling

- Storage parse/access/quota errors fall back to the in-memory state and optionally log a debug warning.
- Autosave errors set the active tab to `error`, retain the draft, and keep the existing toast/retry behavior.
- Manual save errors are propagated from the save handler to the controller wrapper so the active tab remains in `error` instead of being reported as saved.
- Failed-tab close requires explicit confirmation; canceling leaves the tab and draft intact.
- Invalid note snapshots are ignored or revalidated through existing note status logic.

## Performance Considerations

- Avoid network calls on tab activation when a valid local snapshot exists; use existing revalidation only where necessary.
- Throttle scroll persistence with `requestAnimationFrame` or a small debounce.
- Serialize only the workspace state, not React refs or query caches.
- Do not mount multiple editors in v1; only the active tab owns a live editor instance.

## Security Notes

- Workspace state contains note content in browser session storage, protected by the same-origin browser boundary; no auth/session tokens are stored.
- Validate all hydrated values and discard unknown versions/shapes.
- Existing HTML sanitization and editor input handling remain unchanged.
