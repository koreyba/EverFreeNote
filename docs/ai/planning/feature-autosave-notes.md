---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Requirements, design, planning, testing docs drafted
- [x] Milestone 2: Debounced autosave with partial payload + UI states wired
- [ ] Milestone 3: Offline/queue integration validated with tests

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Add debounced autosave handlers for title/tags/body in NoteEditor/RichTextEditor
- [x] Task 1.2: Expose controller API (`handleAutoSave`, partial payload) for autosave

### Phase 2: Core Features
- [x] Task 2.1: Update OfflineCacheService overlay flow to reflect autosave writes (applyNoteOverlay)
- [x] Task 2.2: Enqueue to OfflineQueueService with clientUpdatedAt; ensure compaction/limit policy still applies
- [x] Task 2.3: UI states for Saving…/Saved, pending/failed counters, last saved at

### Phase 3: Integration & Polish
- [x] Task 3.1: Integrate with OfflineSyncManager expectations (no manual drains; rely on queue)
- [ ] Task 3.2: Testing: debounce timing, offline→online queue/compaction, UI indicators

## Dependencies
**What needs to happen in what order?**

- Phase 1 precedes Phase 2; SyncManager validation follows cache/queue wiring in Phase 3.
- Reuse existing offline adapters/services; avoid adding new persistence APIs.

## Timeline & Estimates
**When will things be done?**

- Phase 1: 0.5–1d
- Phase 2: 1d
- Phase 3: 1d (tests may extend if offline cases are complex)

## Risks & Mitigation
**What could go wrong?**

- Excess writes during typing: mitigated with debounce + diffing partial payloads.
- UX flicker/confusion: minimum 500ms status display; consistent Saving…/Saved messaging.
- IndexedDB failures: fallback to localStorage via webOfflineStorageAdapter.
- Queue growth: rely on compaction/enforceLimit policy (~100 items) and partial payloads.

## Resources Needed
**What do we need to succeed?**

- Cypress component/integration harness
- Mocks/stubs for offline cache/queue/sync
- Light Supabase smoke testing (if applicable) after autosave wiring

## Constraints & Notes

- SPA with export only; autosave must remain fully client-side and offline-first (no SSR/server hooks).
