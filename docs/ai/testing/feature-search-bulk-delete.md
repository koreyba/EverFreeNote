---
phase: testing
title: Testing Strategy (Search Bulk Delete)
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Execution Status (2026-03-05)

- Core implementation is complete for pagination, shared delete flow, selection mode, and UX parity fixes.
- Static checks passed in development loop (`type-check`, targeted lint).
- Runtime suite execution is pending (deferred).

## Coverage Goals

- Validate shared delete helper behavior (online + offline).
- Validate panel and sidebar selection flows are consistent.
- Validate tag/query matrix (`tag-only`, `query-only`, `query + tag`).
- Validate blocked mode-switch hint UX on desktop and mobile.

## Unit / Component Tests

### `useNoteBulkActions` and controller wiring
- [ ] `deleteNotesByIds` returns expected `{ total, failed, queuedOffline }`.
- [ ] Invalidates `['notes']` and `['aiSearch']` on completion.
- [ ] Clears `selectedNote` after delete.
- [ ] Offline path writes pending overlay and increments pending count.
- [ ] `deleteSelectedNotes` exits sidebar selection mode.

### `useNoteSearch`
- [ ] `resetFtsResults()` resets offset + accumulation state.
- [ ] `showTagOnlyResults` toggles correctly when query is below minimum.
- [ ] Tag-only pagination (`loadMoreTagOnly`) is wired and guarded.

### `useAIPaginatedSearch`
- [ ] Accumulates groups without duplicates across pages.
- [ ] `aiHasMore` and `aiLoadingMore` transitions are correct.
- [ ] `resetAIResults()` clears accumulated state and offset.

### Selection UI components
- [ ] `SelectionModeActions` renders count and action states correctly.
- [ ] `BulkDeleteDialog` requires typed count before enabling confirm.
- [ ] `useBulkDeleteConfirm` opens dialog and closes after confirm.

### Card behavior
- [ ] `NoteCard` checkbox visibility and toggle behavior in/ out of selection mode.
- [ ] `NoteSearchItem` mirrors selection behavior and suppresses chunk navigation in selection mode.
- [ ] Long press entry works for touch pointers in both card types.

### Mode-switch hint components
- [ ] `AiSearchToggle`: blocked hint appears on desktop hover.
- [ ] `AiSearchToggle`: blocked hint toggles on mobile tap and closes on outside tap.
- [ ] `AiSearchViewTabs`: same desktop/mobile hint behavior.
- [ ] AI info tooltip on mobile does not auto-close immediately after tap.

## Integration Tests

- [ ] Enter panel selection mode from FTS results and manage selection actions.
- [ ] Enter panel selection mode from AI Notes results and manage selection actions.
- [ ] Panel delete flow opens confirm dialog and calls `deleteNotesByIds` only after confirm.
- [ ] Sidebar delete flow uses the same confirm dialog behavior.
- [ ] After delete in FTS/tag-only paths, `resetFtsResults()` path is used.
- [ ] After delete in AI Notes path, `resetAIResults()` path is used.
- [ ] Selection mode auto-exits when selected count reaches `0`.
- [ ] Main sidebar selection state remains independent from panel selection state.
- [ ] Mode switch controls are blocked during panel selection mode.
- [ ] Tag filtering matrix works end-to-end:
  - query only
  - tag only
  - query + tag

## Manual Testing

- [ ] Desktop: hover card shows checkbox in sidebar, FTS, and AI Notes views.
- [ ] Mobile: long press enters selection mode in sidebar, FTS, and AI Notes views.
- [ ] In selection mode, card body toggles selection instead of navigation.
- [ ] Confirm dialog blocks delete until typed count matches selected count.
- [ ] Deleted notes disappear from sidebar and panel after refetch.
- [ ] Offline delete queues operations and shows pending state in both surfaces.
- [ ] AI Chunks view stays non-selectable and does not show selection UI.
- [ ] Blocked mode-switch hint:
  - desktop hover works
  - mobile tap/open/close works

## Performance

- [ ] Bulk delete of 50 notes remains within acceptable latency on normal connection.
- [ ] Load-more remains responsive in FTS and AI Notes views.

## Risks to Re-check

- Regression in sidebar bulk delete after shared-flow refactor.
- Stale accumulated FTS/AI results after delete+refetch.
- Mobile-specific tooltip interactions across browsers.
- Keyboard accessibility of disabled mode-switch controls (follow-up hardening item).
