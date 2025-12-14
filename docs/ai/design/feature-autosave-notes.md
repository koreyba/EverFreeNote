---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

```mermaid
graph TD
  NoteEditor -->|onChange (debounce ~1.5s)| Controller[useNoteAppController]
  Controller --> Overlay[applyNoteOverlay + in-memory state]
  Controller --> Cache[OfflineCacheService (IndexedDB/localStorage)]
  Controller --> Queue[OfflineQueueService]
  Queue --> SyncMgr[OfflineSyncManager (compaction + retry/backoff)]
  SyncMgr --> Supabase[Supabase mutations]
  Cache --> UI[NoteList/NoteView/Sidebar]:::ui
  Overlay --> UI
  UI --> Status["Save/Read button state + pending/failed counters + last saved at"]
  classDef ui fill:#eef9ff,stroke:#7fb3ff
```

- Debounced autosave from NoteEditor/RichTextEditor (title/tags/body) uses `useDebouncedCallback` (default 1.5s, cap 1 autosave per ~2s) and only runs when a diff exists.
- Autosave path: build partial payload (changed fields + `clientUpdatedAt` [+ id/version]), update `OfflineCacheService` + `applyNoteOverlay`, then enqueue to `OfflineQueueService`. No direct network calls.
- `OfflineSyncManager` owns draining/batching/retry/backoff; autosave never calls drain manually.
- UI surfaces `Saving…/Saved` (≥500ms), pending/failed counters, and `lastSavedAt`; Save button disabled while Saving…, Cancel relabeled to Read to exit edit mode.

## Data Models
**What data do we need to manage?**

- `CachedNote`: id, title?, description?, tags?, updatedAt, status (pending/failed/synced), pendingOps?, deleted?; `updatedAt` mirrors `clientUpdatedAt`.
- `MutationQueueItem`: id, noteId, operation (`update`), payload (partial), `clientUpdatedAt`, status (pending/failed/synced), attempts?, lastError?.
- `SavedState`: `lastSavedAt`, `isSavingAuto`, pendingCount, failedCount for UI indicators.

## API Design
**How do components communicate?**

- `useDebouncedCallback(fn, delayMs)` ensures a function runs once after inactivity and resets on rapid input; cleans up on unmount.
- `handleAutoSave(partial)` in `useNoteAppController`:
  - Skip when no changes compared to latest overlay/cache snapshot.
  - `offlineCache.saveNote(partial)` → `applyNoteOverlay` → `offlineQueue.enqueue({ operation: 'update', payload: partial, clientUpdatedAt })`.
  - Update pending counters and `lastSavedAt`; rely on SyncManager for draining.
- UI consumes `handleAutoSave`, `handleSaveNote` (manual), `lastSavedAt`, pending/failed counts.

## Component Breakdown
**What are the major building blocks?**

- Frontend:
  - `NoteEditor` / `RichTextEditor`: debounced autosave for title/tags/body; shows `Saving…/Saved` with 500ms minimum; Save disabled while autosaving; Read button exits edit mode.
  - `Sidebar` / `NoteList`: render overlay/cached data, show pending/failed counters and last saved at (optional).
- Core services:
  - `OfflineCacheService` (IndexedDB/localStorage), `OfflineQueueService`, `OfflineSyncManager`, `applyNoteOverlay`.

## Design Decisions
**Why did we choose this approach?**

- Offline-first: all writes cached locally + queued; network is best-effort via SyncManager (LWW conflicts already assumed).
- Debounce + throttling reduces CPU and queue churn during typing; partial payloads keep storage/network light.
- UI responsiveness via overlay avoids waiting for sync; clear status messaging reduces confusion.
- Compaction/enforceLimit (~100) prevents unbounded queue growth; autosave does not bypass this policy.

## Non-Functional Requirements
**How should the system perform?**

- Performance: no more than one autosave per ~1–2s while typing; partial payloads only; overlay update should be instantaneous to keep UI smooth offline.
- Reliability: IndexedDB primary, localStorage fallback; autosave survives tab close/reopen; queue size bounded by compaction/limit.
- UX: statuses visible ≥500ms; lastSavedAt shown; Save disabled while Saving…; Read button exits edit mode without discarding autosaved changes.

## Constraints & Notes
**Anything else to remember?**

- SPA with export; no SSR/server listeners. Autosave logic must live entirely client-side.
- Trust existing offline services; do not introduce direct Supabase calls from autosave.
