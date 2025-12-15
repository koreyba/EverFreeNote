---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Standard web dev setup: `npm install`, `npm run dev`. Ensure IndexedDB works in the browser; localStorage serves as fallback via `webOfflineStorageAdapter`.

## Code Structure
**How is the code organized?**

- UI: `ui/web/components/features/notes/NoteEditor.tsx`, `RichTextEditor.tsx`, `NotesShell`, `Sidebar`, `NoteList`.
- Controller: `ui/web/hooks/useNoteAppController.ts`.
- Offline: `OfflineCacheService`, `OfflineQueueService`, `OfflineSyncManager`, `applyNoteOverlay`.
- Utilities: `ui/web/hooks/useDebouncedCallback.ts`.

## Implementation Notes
**Key technical details to remember:**

### Core Autosave Flow
- Use `useDebouncedCallback` to debounce note field changes (~1.5s default, cap 1 autosave per ~2s).
- Build partial payload with changed fields + `clientUpdatedAt` (+ id/version when available).
- `handleAutoSave` steps:
  1) Skip if no diff from latest cached/overlay values.
  2) `offlineCache.saveNote(partial)` then `applyNoteOverlay` to update UI immediately.
  3) `offlineQueue.enqueue({ operation: 'update', payload: partial, clientUpdatedAt })`; pendingCount increments; rely on SyncManager for draining/backoff/compaction.
  4) Update `lastSavedAt`; keep Save disabled while autosave is in-flight; show Saving… for ≥500ms.

### Manual Save
- `handleSaveNote` continues to run full save logic but also updates overlay/cache/queue with `clientUpdatedAt`. Save button text: Saving…/Saved; Cancel renamed to Read (return to view mode).

### Patterns & Best Practices
- Always go through controller; do not call Supabase directly from UI for autosave.
- Keep payloads minimal; avoid sending full HTML on every change.
- Maintain offline-first UX: overlay reflects edits instantly even when offline; counters show pending/failed.
- Respect compaction/enforceLimit policies; do not bypass OfflineQueueService.

## Integration Points
**How do pieces connect?**

- `NoteEditor` → debounced `onAutoSave` → `useNoteAppController.handleAutoSave` → offline cache + overlay → queue → `OfflineSyncManager` → Supabase.
- `Sidebar`/`NoteList` read from overlay/cache and pending/failed counters; lastSavedAt shown near editor controls.

## Error Handling
**How do we handle failures?**

- Catch/cache write failures; fallback to localStorage automatically via adapter.
- Queue enqueue errors should surface as failedCount increment and optional toast/badge (reuse existing patterns).
- Sync errors remain in queue with retry/backoff; UI shows failed/pending counts.

## Performance Considerations
**How do we keep it fast?**

- Debounce to avoid per-keystroke queue writes; throttle to ~1 autosave/2s during continuous typing.
- Partial payloads reduce serialization cost; overlay avoids re-render storms from full data reloads.
- Minimum status display of 500ms prevents flicker while keeping the UI responsive.

## Security Notes
**What security measures are in place?**

- Keep all writes scoped to the authenticated user via existing Supabase RLS; autosave uses the same offline queue pipeline.
- Avoid storing sensitive data outside IndexedDB/localStorage; no additional permissions or remote calls introduced.
