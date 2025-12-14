---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Users lose work when closing the tab, switching notes, or losing connectivity; current flow depends on manual Save.
- Typing can lag offline because every keypress pushes full content; we need a lighter autosave path.
- UX lacks consistent feedback for pending/failed saves and last saved time.

## Goals & Objectives
**What do we want to achieve?**

- Add debounced autosave (1–2s, default 1.5s) for title, tags, and body that only fires on actual changes.
- Persist locally first (IndexedDB via webOfflineStorageAdapter, fallback localStorage) and enqueue minimal mutation payloads (changed fields + clientUpdatedAt [+ id/version]).
- Keep UI responsive with overlay updates so edits appear instantly offline; surface Saving…/Saved + pending/failed counters + last saved at.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a note author, if I close the tab or the machine crashes, my in-progress edits should be restored on reopen.
- As a user switching to another note, my current edits should autosave before navigation so nothing is lost.
- As a user typing offline, my changes should queue and sync later without freezes.
- Save button animates to “Saving…” during autosave; Cancel is renamed to “Read” and returns to read mode.

## Success Criteria
**How will we know when we're done?**

- Autosave triggers at most once every ~1.5s while typing and is skipped when there is no diff.
- Autosave writes go through offline cache + overlay + queue (no direct DB calls); payloads are partial with clientUpdatedAt.
- UI shows Saving… then Saved (≥500ms visibility) and updates last saved time; pending/failed counters reflect queue state.
- Offline typing survives tab close/reopen and note switches; online sync eventually clears pending items via OfflineSyncManager compaction/limit (~100).

## Constraints & Assumptions
**What limitations do we need to work within?**

- SPA with export; no SSR/server hooks. Everything must run client-side and offline-first.
- Trust OfflineSyncManager for batching/retry/backoff; do not manually drain from autosave.
- Compaction/enforceLimit policy must remain in effect to avoid unbounded queue growth.
- Conflict resolution is last-write-wins; server logic already assumes LWW.

## Questions & Open Items
**What do we still need to clarify?**

- Exact debounce defaults per field (currently 1.5s) and whether user-configurable.
- Minimum/maximum status display timing and how to surface last sync time vs. last saved at.
- How to surface queue failures (toasts vs. inline badge) without adding noise to the editor.***
