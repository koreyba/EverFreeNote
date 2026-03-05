---
phase: planning
title: Project Planning & Task Breakdown (Search Bulk Delete)
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

- [ ] Milestone 0: AI Notes pagination implemented (load-more, accumulated results)
- [ ] Milestone 1: Shared delete helper extracted (invalidates all caches), no UX changes
- [ ] Milestone 2: Selection mode working in SearchResultsPanel (FTS results + AI Notes view)
- [ ] Milestone 3: Cross-list sync verified, edge cases covered

## Task Breakdown

### Phase 0: AI pagination — extend useAISearch

- [ ] **0.1** Create `useAIPaginatedSearch` hook (or extend `useAISearch`) with accumulated results + offset/topK paging, mirroring `useNoteSearch` FTS pattern. State: `aiOffset`, `aiAccumulatedResults`, `aiHasMore`, `aiLoadingMore`. Expose `resetAIResults()` and `loadMoreAI()`.
- [ ] **0.2** Update `NoteSearchResults` to accept and render `hasMore` / `loadingMore` / `onLoadMore` props (load-more button at bottom, same UX as FTS)
- [ ] **0.3** Wire new paginated hook into `SearchResultsPanel` AI Notes path, replacing current `useAISearch`
- [ ] **0.4** Expose `resetAIResults()` and `loadMoreAI()` from `useNoteAppController`

### Phase 1: Refactor — extract shared delete logic

- [ ] **1.1** Add `deleteNotesByIds(ids: string[]): Promise<void>` to `useNoteAppController` (or expose from `useNoteBulkActions`), encapsulating: offline check, `Promise.allSettled` delete loop, toast, `queryClient.invalidateQueries(['notes'])`, `queryClient.invalidateQueries(['aiSearch'])`, and `setSelectedNote(null)`
- [ ] **1.2** Refactor existing `deleteSelectedNotes` in `useNoteBulkActions` to call `deleteNotesByIds` — verify main-list bulk delete still works identically
- [ ] **1.3** Expose `deleteNotesByIds` from controller return value

### Phase 2: Selection mode in SearchResultsPanel

- [ ] **2.1** Add local state to `SearchResultsPanel`: `panelSelectionMode`, `panelSelectedIds`, `panelBulkDeleting`
- [ ] **2.2** Create `useLongPress` hook — pointer events + 500ms timeout, cancels on move/up/leave
- [ ] **2.3** Update `NoteCard.tsx` — desktop: `opacity-0 group-hover:opacity-100` checkbox (both `compact` and `search` variants); mobile: `useLongPress` on card root triggers `onToggleSelect`. **Applies to main list and FTS results simultaneously.**
- [ ] **2.4** Update `NoteSearchItem.tsx` — mirror 2.3: same hover checkbox and long-press logic for AI Notes view cards
- [ ] **2.5** Wire `selectionMode={panelSelectionMode}`, `selectedIds={panelSelectedIds}`, `onToggleSelect` into `NoteList` FTS path; `onToggleSelect` also sets `panelSelectionMode=true`
- [ ] **2.6** Wire same selection props into `NoteSearchResults` AI Notes path; pass `selectionMode` + `selectedIds` + `onToggleSelect` down to each `NoteSearchItem`
- [ ] **2.7** Disable `AiSearchToggle` when `panelSelectionMode` is true; add `title="Remove selection to switch"` tooltip on the disabled element
- [ ] **2.8** Disable AI Notes/Chunks view tabs when `panelSelectionMode` is true; same tooltip
- [ ] **2.9** Transform results header when `panelSelectionMode` is true: "N selected", "Select all" [disabled if all selected], "Delete (N)" [disabled at 0], "Cancel"
- [ ] **2.10** Add "Delete (N)" action: call `deleteNotesByIds`, exit panel selection mode, call `resetFtsResults()` (FTS) or `resetAIResults()` (AI Notes) based on active view

### Phase 3: Cross-list sync and edge cases

- [ ] **3.1** After panel bulk delete, reset `ftsOffset` to 0 and clear `ftsAccumulatedResults` in `useNoteSearch` so the refetch produces a full fresh page (expose a `resetFtsResults()` callback from `useNoteSearch`)
- [ ] **3.2** Verify that after deletion the main notes list also updates (React Query invalidation covers `['notes', userId, '', null]`)
- [ ] **3.3** Verify offline path: queued deletions show `pending` state in both lists
- [ ] **3.4** Verify empty state: if all FTS or AI Notes results are deleted, panel shows "No results" empty state
- [ ] **3.5** Verify AI Notes pagination: load-more works, accumulated results accumulate correctly
- [ ] **3.6** Verify AI Notes delete edge case: after delete, `resetAIResults()` clears accumulation → `invalidateQueries(['aiSearch'])` → first page refetches cleanly without deleted notes

## Dependencies

- Phase 0 is independent — can run in parallel with Phase 1
- Phase 2 depends on Phase 0 (AI pagination) and Phase 1 (deleteNotesByIds)
- Phase 3 depends on Phase 2 (integration testing)
- Backend (`rag-search` function) may need `topK` increase or offset support — assess during Phase 0
- `NoteList` already supports selection props — no changes needed there
- `NoteSearchResults` needs selection + pagination props added (tasks 2.6, 0.2); `NoteSearchItem` needs hover/long-press (task 2.4)

## Timeline & Estimates

| Phase | Effort |
|-------|--------|
| Phase 0 — AI pagination | Medium (2–3h) |
| Phase 1 — Refactor | Small (1–2h) |
| Phase 2 — Selection UI | Medium (3–4h) |
| Phase 3 — Sync & edge cases | Small (1h + testing) |

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
