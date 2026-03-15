---
phase: implementation
title: Implementation Guide - Mobile Search Remote Delete Consistency
description: Implementation notes for reconciling remote deletions on mobile while preserving offline fallback and sync behavior
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Current implementation work is on branch `codex/mobile-search-remote-delete-consistency-main` in the main repository worktree.
- Use the root `npm ci` install for shared web/core dependencies.
- Use `ui/mobile/npm ci` for mobile-specific dependencies and tests.

## Code Structure
**How is the code organized?**

- `core/services/notes.ts`
  - Owns note read semantics returned from Supabase
- `ui/mobile/hooks/useNotes.ts`
  - Owns note-detail fallback policy
- `ui/mobile/hooks/useSearch.ts`
  - Owns regular mobile search query behavior
- `ui/mobile/services/database.ts`
  - Owns local SQLite reconciliation for deleted notes
- `ui/mobile/app/(tabs)/search.tsx`
  - Owns search-screen lifecycle behavior and user-facing state
- `ui/mobile/app/note/[id].tsx`
  - Owns deleted-note UX in the detail flow

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Replace generic note-read failure handling with explicit semantic classification.
- Only allow SQLite fallback when the app is offline or the server failure is retryable.
- When the app is online and the note is remotely deleted, reconcile stale data out of React Query and SQLite.
- Reconciliation in v1 is driven by manual refresh, cold start (full process kill and relaunch — background-to-foreground resume does not count), and repeated search execution rather than background focus triggers.
- After returning from a deleted-note alert, the stale item is allowed to remain in the search list until the next confirmed refresh point.
- Manual refresh is implemented as pull-to-refresh on the mobile search results list for both regular search and AI search.
- If a user taps a stale deleted note before refresh, show deleted-note feedback and return them to the notes list or search context they came from.
- The app does not need to remove the stale item from an already-open regular or AI search results list before the next confirmed refresh point.
- Apply the same deleted-note handling rule to AI search result opens, not only regular search.
- Preserve existing queue/sync behavior so local changes still attempt cloud sync after temporary failure recovery.
- Conflict policy: when remote deletion conflicts with unsynced local edits, local edits win — the note is restored from the locally edited version.
- Bulk delete silently skips notes that no longer exist on the server and completes the operation for the remaining ones.

### Actual Implementation Status
- `core/services/notes.ts` now exposes `getNoteStatus()` with `found`, `not_found`, and `transient_error`.
- `ui/mobile/hooks/useNotes.ts` uses that semantic result to allow local fallback only for transient failures and to mark remotely deleted notes as deleted in SQLite.
- `ui/mobile/hooks/useOpenNote.ts` no longer seeds the note detail query cache from stale search results before navigation.
- `ui/mobile/app/note/[id].tsx` shows deleted-note feedback and returns the user to the previous context instead of rendering a stale note.
- `ui/mobile/components/search/SearchResultsList.tsx` now supports pull-to-refresh, and `ui/mobile/app/(tabs)/search.tsx` wires it to both regular search and AI search refetch flows.
- `ui/web/hooks/useNoteAppController.ts` now revalidates notes before opening them from the web list/search when the browser is online and there are no unsynced local edits for that note. Confirmed `not_found` clears stale offline cache for that note, shows deleted-note feedback, and invalidates notes queries instead of promoting stale data into `selectedNote`.

### Patterns & Best Practices
- Keep transport-error interpretation centralized instead of duplicating it inside screen components.
- Reuse existing cache invalidation helpers where possible.
- Prefer targeted local cleanup over broad cache/database resets.

## Integration Points
**How do pieces connect?**

- Supabase note reads feed typed outcomes into mobile hooks.
- Mobile hooks update React Query caches and local SQLite together during reconciliation.
- Offline sync continues using the existing queue manager and conflict policy.

## Error Handling
**How do we handle failures?**

- `not_found`:
  - treat as authoritative remote deletion when online
  - reconcile local stale state
  - show deleted-note UX and navigate back to the prior context
- `transient_error`:
  - preserve fallback path
  - keep local data available
  - allow retry or later sync
- unexpected errors:
  - surface safely and avoid destructive cleanup until the condition is understood

## Performance Considerations
**How do we keep it fast?**

- Avoid full database scans if targeted `noteId` cleanup is enough.
- Limit refetch behavior to meaningful lifecycle boundaries instead of aggressive polling.
- Keep search query and tag filter intact during reconciliation to avoid unnecessary re-renders and user confusion.

## Security Notes
**What security measures are in place?**

- Continue relying on authenticated Supabase access.
- Keep deleted-note UX generic and do not reveal deleted content after reconciliation.
