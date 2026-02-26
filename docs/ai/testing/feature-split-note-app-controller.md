---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals

- **Unit test coverage:** 100% of all new hooks (`useNoteData`, `useNoteSaveHandlers`, `useNoteBulkActions`)
- **Integration test scope:** Critical paths in the orchestrator — verify each sub-hook wires correctly and the public API is unchanged
- **End-to-end:** Existing E2E tests cover the user flows; no new E2E tests required (structural refactor only)
- **Regression scope:** All pre-existing tests must continue to pass without modification

## Test Files Written (2026-02-26)

| File | Covers |
|---|---|
| `cypress/component/ui/web/hooks/useNoteData.cy.tsx` | overlay merge, notesById, selectedCount, FTS display counts, FTS+overlay merge |
| `cypress/component/ui/web/hooks/useNoteSaveHandlers.cy.tsx` | insert/update calls, handleReadNote exits editing, confirmDeleteNote, autoSave skip conditions |
| `cypress/component/ui/web/hooks/useNoteBulkActions.cy.tsx` | toggleNoteSelection, deleteSelectedNotes (online), exits selection, clears selectedNote |

**Run command:** `npm run test:component` or `cypress open --component`

> Note: Cypress requires a display/GPU. Cannot be run in the current headless bash environment (Electron exits with STATUS_ILLEGAL_INSTRUCTION). Run from a Windows terminal or CI with display support.

## Unit Tests

### `useNoteData`
- [ ] Returns empty `notes` when `baseNotes` is empty and no overlay
- [ ] Applies `offlineOverlay` to `baseNotes` via `applyNoteOverlay`
- [ ] Returns `baseNotes` unchanged when `offlineOverlay` is empty array
- [ ] `notesById` maps note IDs to note objects correctly
- [ ] `resolveSearchResult` returns input unchanged when note not in `notesById`
- [ ] `resolveSearchResult` merges latest note fields when note is in `notesById`
- [ ] `mergedFtsData` is `undefined` when `aggregatedFtsData` is `undefined`
- [ ] `mergedFtsData` maps results through `resolveSearchResult`
- [ ] `totalNotes` reads from `notesQuery.data.pages[0].totalCount` when available
- [ ] `totalNotes` falls back to `notes.length` when pages are absent
- [ ] `notesDisplayed` uses FTS result count when `showFTSResults` is true
- [ ] `notesDisplayed` uses `notes.length` when `showFTSResults` is false
- [ ] `selectedCount` equals `selectedNoteIds.size`
- [ ] `notesRef.current` is kept in sync with `notes` via `useEffect`

### `useNoteSaveHandlers`
- [ ] `handleAutoSave` — skips when `user` is null
- [ ] `handleAutoSave` — skips new-note creation when all fields empty
- [ ] `handleAutoSave` — skips update when no fields changed (same title/desc/tags)
- [ ] `handleAutoSave` — calls `createNoteMutation.mutateAsync` for new note (online)
- [ ] `handleAutoSave` — queues `create` offline mutation and sets overlay for new note (offline)
- [ ] `handleAutoSave` — calls `enqueueMutation` update and updates overlay for existing note
- [ ] `handleAutoSave` — refreshes `pendingCount` and `failedCount` from queue after each save
- [ ] `handleAutoSave` — sets `autoSaving` true during execution, false in finally
- [ ] `handleSaveNote` — updates via `updateNoteMutation.mutateAsync` for existing note (online)
- [ ] `handleSaveNote` — enqueues offline update and sets overlay for existing note (offline)
- [ ] `handleSaveNote` — creates via `createNoteMutation.mutateAsync` for new note (online)
- [ ] `handleSaveNote` — enqueues offline create for new note (offline)
- [ ] `handleSaveNote` — sets `saving` true during execution, false in finally
- [ ] `handleReadNote` — calls `handleSaveNote` then sets `isEditing` to false
- [ ] `confirmDeleteNote` — does nothing when `noteToDelete` is null
- [ ] `confirmDeleteNote` — calls `deleteNoteMutation.mutateAsync` (online)
- [ ] `confirmDeleteNote` — enqueues offline delete and sets deleted overlay (offline)
- [ ] `confirmDeleteNote` — clears `selectedNote` when deleted note was selected
- [ ] `confirmDeleteNote` — closes delete dialog and clears `noteToDelete` in finally
- [ ] `handleRemoveTagFromNote` — does nothing when note not in `notes`
- [ ] `handleRemoveTagFromNote` — calls `removeTagMutation.mutateAsync` with filtered tags
- [ ] `handleRemoveTagFromNote` — updates `selectedNote` when removed note is currently selected

### `useNoteBulkActions`
- [ ] `selectAllVisible` — passes `notes` to `selectAllVisibleCallback` when FTS is not shown
- [ ] `selectAllVisible` — passes `mergedFtsData.results` to `selectAllVisibleCallback` when FTS is shown
- [ ] `deleteSelectedNotes` — does nothing when `selectedNoteIds` is empty
- [ ] `deleteSelectedNotes` — calls `deleteNoteMutation.mutateAsync` for each ID (online)
- [ ] `deleteSelectedNotes` — shows error toast for partially failed batch (online)
- [ ] `deleteSelectedNotes` — shows success toast for fully successful batch (online)
- [ ] `deleteSelectedNotes` — calls `enqueueBatchAndDrainIfOnline` for all IDs (offline)
- [ ] `deleteSelectedNotes` — marks each note as deleted in overlay (offline)
- [ ] `deleteSelectedNotes` — calls `exitSelectionMode` after deletion
- [ ] `deleteSelectedNotes` — invalidates `['notes']` query after deletion
- [ ] `deleteSelectedNotes` — sets `selectedNote` to null after deletion
- [ ] `deleteSelectedNotes` — sets `bulkDeleting` true during execution, false in finally

## Integration Tests
**How do we test component interactions?**

- [ ] `useNoteAppController` public API type matches `NoteAppController` exactly (TypeScript compile check)
- [ ] `useNoteAppController` wires `useNoteData` output to `useNoteSaveHandlers` correctly (notesRef, notes)
- [ ] `useNoteAppController` wires `useNoteBulkActions` with correct `mergedFtsData` and `notes`
- [ ] Calling `handleSaveNote` via the controller updates overlay visible in `notes` (end-to-end data flow)
- [ ] Bulk delete via controller invalidates note query and clears selection state

## End-to-End Tests
**What user flows need validation?**

These flows are covered by existing tests; confirm they still pass after refactor:

- [ ] User flow: Create a new note, auto-save fires, note appears in list
- [ ] User flow: Edit existing note, manual save, changes persist
- [ ] User flow: Delete a single note via delete dialog
- [ ] User flow: Enter selection mode, select all, bulk delete
- [ ] User flow: Go offline, create note, go online, sync completes
- [ ] Regression: FTS search results merge with offline overlay correctly

## Test Data
**What data do we use for testing?**

- Mock `NoteViewModel` factory: `{ id: 'note-1', title: 'Test', description: '', tags: [], updated_at: '...' }`
- Mock `CachedNote` factory: `{ id: 'note-1', status: 'pending', updatedAt: '...' }`
- Mock mutations: Jest mocks returning resolved promises
- Mock offline queue: in-memory implementation returning predefined items

## Test Reporting & Coverage

- Run: `npm run test -- --coverage` (adjust to project test command)
- Coverage threshold: 100% statements/branches for the 3 new hook files
- Coverage gaps: None expected (all branches in save handlers have online + offline paths)

## Manual Testing
**What requires human validation?**

### Offline save smoke test
1. Open DevTools → Network → set "Offline"
2. Create a new note — confirm it appears with "pending" badge
3. Edit an existing note — confirm autosave shows "Saving..." then succeeds
4. Delete a note — confirm it disappears from list
5. Go back online — confirm sync drains and badges clear

### Bulk delete smoke test
1. Enter selection mode (long-press or selection button)
2. Select 3+ notes
3. Delete — confirm success toast and notes removed
4. Repeat with DevTools offline — confirm "queued offline" toast

### FTS + overlay smoke test
1. Search for a term that returns results
2. Edit one of the matching notes offline
3. Confirm the search result reflects the offline edit

## Performance Testing

No performance testing required — the refactor makes no algorithmic changes.

## Bug Tracking

- Regressions discovered during testing should be fixed before merging
- If a regression is found in `handleAutoSave` or `handleSaveNote`, compare the extracted hook byte-for-byte with the original to locate the diff
