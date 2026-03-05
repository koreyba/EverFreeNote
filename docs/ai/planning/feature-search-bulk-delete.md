---
phase: planning
title: Project Planning & Task Breakdown (Search Bulk Delete)
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 0: AI Notes pagination implemented (load-more, accumulated results)
- [x] Milestone 1: Shared delete helper extracted (invalidates all caches), no UX changes
- [x] Milestone 2: Selection mode working in SearchResultsPanel (FTS results + AI Notes view)
- [ ] Milestone 3: Cross-list sync verified, edge cases covered

## Task Breakdown

### Phase 0: AI pagination - extend useAISearch

- [x] **0.1** Create `useAIPaginatedSearch` hook (or extend `useAISearch`) with accumulated results + offset/topK paging, mirroring `useNoteSearch` FTS pattern. State: `aiOffset`, `aiAccumulatedResults`, `aiHasMore`, `aiLoadingMore`. Expose `resetAIResults()` and `loadMoreAI()`.
- [x] **0.2** Update `NoteSearchResults` to accept and render `hasMore` / `loadingMore` / `onLoadMore` props (load-more button at bottom, same UX as FTS)
- [x] **0.3** Wire new paginated hook into `SearchResultsPanel` AI Notes path, replacing current `useAISearch`
- [x] **0.4** Expose `resetAIResults()` and `loadMoreAI()` from `useNoteAppController`

### Phase 1: Refactor - extract shared delete logic

- [x] **1.1** Add `deleteNotesByIds(ids: string[]): Promise<void>` to `useNoteAppController` (or expose from `useNoteBulkActions`), encapsulating: offline check, `Promise.allSettled` delete loop, toast, `queryClient.invalidateQueries(['notes'])`, `queryClient.invalidateQueries(['aiSearch'])`, and `setSelectedNote(null)`
- [x] **1.2** Refactor existing `deleteSelectedNotes` in `useNoteBulkActions` to call `deleteNotesByIds` - verify main-list bulk delete still works identically
- [x] **1.3** Expose `deleteNotesByIds` from controller return value

### Phase 2: Selection mode in SearchResultsPanel

- [x] **2.1** Add local state to `SearchResultsPanel`: `panelSelectionMode`, `panelSelectedIds`, `panelBulkDeleting`
- [x] **2.2** Create `useLongPress` hook - pointer events + 500ms timeout, cancels on move/up/leave
- [x] **2.3** Update `NoteCard.tsx` - desktop: `opacity-0 group-hover:opacity-100` checkbox (both `compact` and `search` variants); mobile: `useLongPress` on card root triggers `onToggleSelect`. **Applies to main list and FTS results simultaneously.**
- [x] **2.4** Update `NoteSearchItem.tsx` - mirror 2.3: same hover checkbox and long-press logic for AI Notes view cards
- [x] **2.5** Wire `selectionMode={panelSelectionMode}`, `selectedIds={panelSelectedIds}`, `onToggleSelect` into `NoteList` FTS path; `onToggleSelect` also sets `panelSelectionMode=true`
- [x] **2.6** Wire same selection props into `NoteSearchResults` AI Notes path; pass `selectionMode` + `selectedIds` + `onToggleSelect` down to each `NoteSearchItem`
- [x] **2.7** Disable `AiSearchToggle` when `panelSelectionMode` is true; add `title="Remove selection to switch"` tooltip on the disabled element
- [x] **2.8** Disable AI Notes/Chunks view tabs when `panelSelectionMode` is true; same tooltip
- [x] **2.9** Transform results header when `panelSelectionMode` is true: "N selected", "Select all" [disabled if all selected], "Delete (N)" [disabled at 0], "Cancel"
- [x] **2.10** Add "Delete (N)" action: call `deleteNotesByIds`, exit panel selection mode, call `resetFtsResults()` (FTS) or `resetAIResults()` (AI Notes) based on active view

### Phase 3: Cross-list sync and edge cases

- [x] **3.1** After panel bulk delete, reset `ftsOffset` to 0 and clear `ftsAccumulatedResults` in `useNoteSearch` so the refetch produces a full fresh page (expose a `resetFtsResults()` callback from `useNoteSearch`)
- [ ] **3.2** Verify that after deletion the main notes list also updates (React Query invalidation covers `['notes', userId, '', null]`)
- [ ] **3.3** Verify offline path: queued deletions show `pending` state in both lists
- [ ] **3.4** Verify empty state: if all FTS or AI Notes results are deleted, panel shows "No results" empty state
- [ ] **3.5** Verify AI Notes pagination: load-more works, accumulated results accumulate correctly
- [ ] **3.6** Verify AI Notes delete edge case: after delete, `resetAIResults()` clears accumulation -> `invalidateQueries(['aiSearch'])` -> first page refetches cleanly without deleted notes

### Phase 2B: UX parity and regression fixes (discovered during implementation)

- [x] **2B.1** Align selection actions UI between left sidebar and SearchResultsPanel using a shared component (`SelectionModeActions`).
- [x] **2B.2** Fix sidebar `Select all` mismatch (count updated, but card checkboxes not selected) by ensuring sidebar select-all source is the visible notes list, not FTS data.
- [x] **2B.3** Unify delete confirmation flow: both sidebar and SearchResultsPanel require `BulkDeleteDialog` confirmation before bulk delete.
- [x] **2B.4** Add shared confirm/delete orchestration hook (`useBulkDeleteConfirm`) to reduce duplicated dialog-flow logic.
- [x] **2B.5** Restore tag/filter behavior matrix in search panel: `tag-only` (no query) returns notes by tag, `query-only` returns by search text, `query + tag` applies combined filtering.
- [x] **2B.6** Improve narrow-width selection header readability by shortening left status text to compact count representation.

## Progress Reconciliation (2026-03-05)

### Done
- Phase 0 (`0.1`-`0.4`) completed, including AI pagination hook and controller exposure.
- Phase 1 (`1.1`-`1.3`) completed with shared `deleteNotesByIds` and unified cache invalidation.
- Phase 2 (`2.1`-`2.10`) completed for selection mode in SearchResultsPanel.
- Phase 3 (`3.1`) completed via `resetFtsResults`.
- Phase 2B (`2B.1`-`2B.6`) completed for UX parity and regressions discovered during integration.

### In Progress
- Milestone 3 remains open pending runtime verification tasks `3.2`-`3.6`.

### Blocked
- No code blockers.
- Runtime validation is pending because Cypress/manual execution was deferred in this cycle.
- Feature lint check for branch/worktree context is currently failing (`feature-search-bulk-delete` branch missing in this repo context); documentation and code tasks are unaffected, but release-flow checks should be run in the intended feature branch/worktree.

### Newly Discovered Work
- Shared selection action UI and shared confirmation flow were extracted to avoid duplicated behavior and future drift.
- Tag-only filtering path was reintroduced in SearchResultsPanel to preserve expected legacy UX.

## Next Steps (Actionable)

1. Run runtime verification for `3.2` and `3.4` (main-list sync + empty state after bulk delete).
2. Run offline scenario verification for `3.3` (queued delete and pending status in both surfaces).
3. Validate AI-specific paths for `3.5` and `3.6` (pagination accumulation and clean first-page refetch after delete).
4. Run `npx ai-devkit@latest lint --feature search-bulk-delete` in the intended `feature-search-bulk-delete` branch/worktree context to clear lifecycle gating checks.

## Planning Summary

Implementation scope is complete for core feature delivery plus additional UX parity fixes discovered during integration, including restored `query/tag` filter matrix behavior. The main remaining risk is behavioral drift in runtime-only scenarios (offline queue and edge-case refresh behavior), not missing code paths. Upcoming focus is verification of Milestone 3 (`3.2`-`3.6`) and lifecycle closure checks in the intended feature branch/worktree context.

## Dependencies

- Phase 0 is independent - can run in parallel with Phase 1
- Phase 2 depends on Phase 0 (AI pagination) and Phase 1 (deleteNotesByIds)
- Phase 3 depends on Phase 2 (integration testing)
- Backend (`rag-search` function) may need `topK` increase or offset support - assess during Phase 0
- `NoteList` already supports selection props - no changes needed there
- `NoteSearchResults` needs selection + pagination props added (tasks 2.6, 0.2); `NoteSearchItem` needs hover/long-press (task 2.4)

## Timeline & Estimates

| Phase | Effort |
|-------|--------|
| Phase 0 - AI pagination | Medium (2-3h) |
| Phase 1 - Refactor | Small (1-2h) |
| Phase 2 - Selection UI | Medium (3-4h) |
| Phase 3 - Sync & edge cases | Small (1h + testing) |

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `ftsAccumulatedResults` not clearing after delete | Medium | Expose `resetFtsResults()` from `useNoteSearch` and call it on delete success |
| Main-list selection mode broken by refactor | Low | Run existing tests after Phase 1; behaviour is pure delegation |
| Offline path untested for panel context | Medium | Manual test with network disabled; same code path as main list |
| AI Chunks view cards rendered with selection UI | Low | Chunks view tabs disabled when selection active; no `onToggleSelect` prop on chunk cards |

## Resources Needed

- No new dependencies
- No backend changes
- `NoteList` FTS path already renders checkboxes via existing `selectionMode` prop
