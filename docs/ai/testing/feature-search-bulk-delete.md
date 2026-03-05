---
phase: testing
title: Testing Strategy (Search Bulk Delete)
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Execution Status (2026-03-05)

- Implementation for phases 0-2 and task 3.1 is complete.
- Static checks passed: `npm run type-check`, targeted `eslint`.
- Runtime tests (Cypress/manual smoke) are deferred by request.
- Milestone 3 verification tasks (3.2-3.6) stay open until runtime tests resume.

## Coverage Goals

- Unit and component coverage for new delete and selection flows.
- Integration coverage for panel selection and cross-list sync.
- Manual offline smoke for queued deletion behavior.

## Unit Tests

### deleteNotesByIds helper
- [ ] Calls `deleteNoteMutation.mutateAsync` for each ID in parallel.
- [ ] Invalidates `['notes']` and `['aiSearch']` on completion.
- [ ] Shows success toast on full success.
- [ ] Shows error toast on partial failure.
- [ ] Uses offline enqueue path when `isOffline === true`.
- [ ] Sets `selectedNote` to `null` after delete.

### resetFtsResults in useNoteSearch
- [ ] Resets `ftsOffset` to `0`.
- [ ] Clears `ftsAccumulatedResults`.
- [ ] Resets `lastProcessedDataRef`.

### SearchResultsPanel local selection
- [ ] `togglePanelSelection` add/remove behavior is correct.
- [ ] `exitPanelSelectionMode` clears mode and selected IDs.
- [ ] `Select all` selects all visible IDs in active view.
- [ ] `panelBulkDeleting` true during delete and false after.

## Integration Tests

- [ ] Enter panel selection mode on FTS card and see checkboxes.
- [ ] Enter panel selection mode on AI Notes card and see checkboxes.
- [ ] `Delete (N)` calls `deleteNotesByIds` with selected IDs.
- [ ] After delete, FTS path calls `resetFtsResults` and refetches.
- [ ] After delete, AI Notes path calls `resetAIResults` and refetches.
- [ ] Main-list selection mode remains independent from panel mode.
- [ ] Mode switch controls are disabled while panel selection is active.

## Manual Testing

- [ ] Desktop: hover card (FTS + AI Notes) shows checkbox; click enters selection mode.
- [ ] Mobile: long press card (FTS + AI Notes) enters selection mode.
- [ ] Checkbox click does not navigate when selecting.
- [ ] `Delete (N)` shows spinner while request is in flight.
- [ ] Deleted notes disappear from panel and main list after refetch.
- [ ] Disable network -> delete -> re-enable and verify queued deletion sync.
- [ ] AI Chunks tab has no selection UI and remains non-selectable.

## Performance

- Bulk delete of 50 notes completes under acceptable latency on normal connection.

## Risks to Re-check

- Main-list bulk delete regression after refactor to `deleteNotesByIds`.
- Stale FTS/AI accumulated results after delete and refetch.
- Offline queued deletions reflected consistently in visible lists.
