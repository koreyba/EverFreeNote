---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- High confidence in autosave reliability: debounce, diffing, cache/queue writes, overlay updates.
- Cover offline→online sync flow, queue compaction/limit adherence, and UI indicators (Saving…/Saved, counters, lastSavedAt).
- Component tests for editor interactions; integration/E2E for offline recovery and sync behavior.

## Unit Tests
**What individual components need testing?**

### useNoteAppController (autosave handler)
- [ ] Enqueues partial update with clientUpdatedAt and increments pendingCount.
- [ ] Skips enqueue when no changes (diff check).
- [ ] Updates offline cache + overlay before queue write.

### useDebouncedCallback
- [ ] Calls once after delay.
- [ ] Cancels/restarts on rapid input.
- [ ] Cleans timer on unmount.

### Offline services (reuse mocks)
- [ ] Compaction/enforceLimit invoked during autosave enqueues (policy preserved).

## Integration Tests
**How do we test component interactions?**

- [x] NoteEditor + controller: typing triggers debounced autosave, Saving… state visible, Save disabled during autosave (component test).
- [ ] Offline mode: autosave enqueues pending items and updates counters.
- [ ] Online sync: queue drained by SyncManager mock; overlay reconciled; pending drops.

## End-to-End Tests
**What user flows need validation?**

- [ ] Typing a note → close tab → reopen: content restored from cache.
- [ ] Switch to another note: current note autosaved; reopened with latest edits.
- [ ] Offline typing → go online: changes reach server (mocked Supabase) without duplicate saves; queue respects compaction/limit.

## Test Data
**What data do we use for testing?**

- Fixture notes with ids, simple text/tags, and a large body sample for performance.
- Mocked offline storage/queue for unit/component; real IndexedDB (or cypress indexeddb shim) for E2E.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Commands: `npm run type-check`, `npm run test:component`, `npm run test:e2e` (spec-filtered).
- Track coverage for NoteEditor/component tests; document gaps for offline/sync E2E if pending.

## Manual Testing
**What requires human validation?**

- UX polish: Saving…/Saved animation (≥500ms), lastSavedAt rendering, Save disabled while saving, Read button behavior.
- Browser refresh/close tab recovery.
- Slow network/offline throttling experience.

## Performance Testing
**How do we validate performance?**

- Debounce effective: no more than 1 autosave per ~1–2s during continuous typing.
- Queue size stable with compaction; cache write time not noticeable in UI.

## Bug Tracking
**How do we manage issues?**

- Log/regress autosave/queue/overlay bugs with steps, pending/failed counters, and lastSavedAt values; prioritize data-loss risks as highest severity.
