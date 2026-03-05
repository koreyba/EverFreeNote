---
phase: planning
title: Project Planning & Task Breakdown (Search Bulk Delete)
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

- [ ] Milestone 1: Shared delete helper extracted, no UX changes
- [ ] Milestone 2: Selection mode working in SearchResultsPanel (FTS results)
- [ ] Milestone 3: Cross-list sync verified, edge cases covered

## Task Breakdown

### Phase 1: Refactor — extract shared delete logic

- [ ] **1.1** Add `deleteNotesByIds(ids: string[]): Promise<void>` to `useNoteAppController` (or expose from `useNoteBulkActions`), encapsulating: offline check, `Promise.allSettled` delete loop, toast, `queryClient.invalidateQueries(['notes'])`, and `setSelectedNote(null)`
- [ ] **1.2** Refactor existing `deleteSelectedNotes` in `useNoteBulkActions` to call `deleteNotesByIds` — verify main-list bulk delete still works identically
- [ ] **1.3** Expose `deleteNotesByIds` from controller return value

### Phase 2: Selection mode in SearchResultsPanel

- [ ] **2.1** Add local state to `SearchResultsPanel`: `panelSelectionMode`, `panelSelectedIds`, `panelBulkDeleting`
- [ ] **2.2** Add selection mode toggle button to panel header (visible only when FTS results are showing). "Select" enters mode, "Cancel" exits and clears selection
- [ ] **2.3** Wire `selectionMode={panelSelectionMode}`, `selectedIds={panelSelectedIds}`, `onToggleSelect` into `NoteList` FTS path
- [ ] **2.4** Add "Select all" action (selects all currently loaded `ftsAccumulatedResults`)
- [ ] **2.5** Add "Delete selected (N)" button; on click → call `deleteNotesByIds(panelSelectedIds)` → on success: exit panel selection mode, reset FTS offset/accumulated results

### Phase 3: Cross-list sync and edge cases

- [ ] **3.1** After panel bulk delete, reset `ftsOffset` to 0 and clear `ftsAccumulatedResults` in `useNoteSearch` so the refetch produces a full fresh page (expose a `resetFtsResults()` callback from `useNoteSearch`)
- [ ] **3.2** Verify that after deletion the main notes list also updates (React Query invalidation covers `['notes', userId, '', null]`)
- [ ] **3.3** Verify offline path: queued deletions show `pending` state in both lists
- [ ] **3.4** Verify empty state: if all FTS results are deleted, panel shows "No results" empty state

## Dependencies

- Phase 2 depends on Phase 1 (needs `deleteNotesByIds`)
- Phase 3 depends on Phase 2 (integration testing)
- No backend changes required
- `NoteList` already supports selection props — no changes needed there

## Timeline & Estimates

| Phase | Effort |
|-------|--------|
| Phase 1 — Refactor | Small (1–2h) |
| Phase 2 — Selection UI | Medium (2–3h) |
| Phase 3 — Sync & edge cases | Small (1h + testing) |

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `ftsAccumulatedResults` not clearing after delete | Medium | Expose `resetFtsResults()` from `useNoteSearch` and call it on delete success |
| Main-list selection mode broken by refactor | Low | Run existing tests after Phase 1; behaviour is pure delegation |
| Offline path untested for panel context | Medium | Manual test with network disabled; same code path as main list |
| AI search cards have no selection UX | N/A | AI results are explicitly out of scope |

## Resources Needed

- No new dependencies
- No backend changes
- `NoteList` FTS path already renders checkboxes via existing `selectionMode` prop
