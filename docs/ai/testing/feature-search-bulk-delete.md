---
phase: testing
title: Testing Strategy (Search Bulk Delete)
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals

- Unit tests for `deleteNotesByIds` (extracted helper) — 100% of new logic
- Unit tests for `resetFtsResults` in `useNoteSearch`
- Integration tests for the panel selection flow end-to-end
- Manual smoke test for offline path

## Unit Tests

### `deleteNotesByIds` helper
- [ ] Calls `deleteNoteMutation.mutateAsync` for each ID in parallel
- [ ] Calls `queryClient.invalidateQueries(['notes'])` after successful delete
- [ ] Shows `toast.success` with count on success
- [ ] Shows `toast.error` on partial failure (some rejected)
- [ ] Uses offline enqueue path when `isOffline === true`
- [ ] Sets `selectedNote` to `null` after delete

### `resetFtsResults` in `useNoteSearch`
- [ ] Resets `ftsOffset` to 0
- [ ] Clears `ftsAccumulatedResults`
- [ ] Resets `lastProcessedDataRef`

### Panel selection state (SearchResultsPanel)
- [ ] `togglePanelSelection` adds ID if not present, removes if present
- [ ] `exitPanelSelectionMode` clears both `panelSelectionMode` and `panelSelectedIds`
- [ ] "Select all" sets `panelSelectedIds` to all IDs in `ftsAccumulatedResults`
- [ ] `panelBulkDeleting` is true during delete, false after

## Integration Tests

- [ ] Enter panel selection mode → checkboxes appear on FTS result cards
- [ ] Toggle individual cards → `panelSelectedIds` updates correctly
- [ ] "Select all" → all loaded results checked
- [ ] "Delete selected" → `deleteNotesByIds` called with correct IDs → cache invalidated → both lists refetch
- [ ] After deletion, `resetFtsResults` called → `ftsAccumulatedResults` cleared → panel shows updated results
- [ ] Main-list selection mode is unaffected when panel selection mode is active
- [ ] "Cancel" exits selection mode without deleting

## End-to-End Tests

- [ ] User flow: search → enter selection mode → select 2 notes → delete → notes disappear from panel and main list
- [ ] User flow: main list select 3 notes → delete (unaffected regression test)
- [ ] Edge case: delete all results on current page → panel shows empty state
- [ ] Edge case: offline deletion → notes show pending state → sync when online

## Test Data

- Minimum 5 FTS-indexed notes with the same tag or keyword for search scenario
- At least one note on page 2 (offset > 0) to verify pagination edge case

## Test Reporting & Coverage

- Run: `npm run test -- --coverage` (web unit tests)
- Coverage target: 100% of new functions in `useNoteAppController`, `useNoteSearch`, `SearchResultsPanel`
- Manual testing required for offline path (network devtools throttling)

## Manual Testing

- [ ] Enter selection mode via button — checkboxes appear on all FTS cards
- [ ] Checkbox click doesn't navigate to note
- [ ] "Delete (N)" button shows spinner during deletion
- [ ] After deletion: correct toast shown, results update, panel stays open
- [ ] Main list is updated (scroll to verify deleted notes gone)
- [ ] Disable network → delete → re-enable → verify notes eventually deleted
- [ ] AI search mode: no selection button visible (out of scope)
- [ ] Mobile: selection mode button accessible, checkboxes usable

## Performance Testing

- Bulk delete of 50 notes: all requests fire in parallel, total time < 5s on normal connection.

## Bug Tracking

- Regression: main-list bulk delete must work identically post-refactor (verify `deleteSelectedNotes` delegates correctly)
- Edge case: `ftsAccumulatedResults` must not contain stale deleted notes after `resetFtsResults` + refetch
