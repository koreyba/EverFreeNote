---
phase: testing
title: Testing Strategy (Search Bulk Delete)
description: Detailed test catalog for search-panel and sidebar bulk delete flows
---

# Testing Strategy

## Objective

Provide complete automated and manual coverage for the new bulk-delete behavior in:
- Search Results Panel (FTS, tag-only, AI Notes)
- Sidebar notes list
- Shared selection actions and shared confirmation dialog
- Shared delete helper and cache invalidation side effects

## Scope

In scope:
- Selection mode entry and exit behavior
- Bulk delete confirmation flow
- Cross-surface synchronization after delete
- Offline queued delete path
- Tag/query filtering matrix
- AI Notes pagination reset behavior after delete
- Blocked mode-switch hints while selection mode is active

Out of scope:
- AI Chunks bulk selection/deletion
- Mobile native app behavior

## Test Priority Model

- `P0`: release-blocking and data integrity
- `P1`: major UX and interaction correctness
- `P2`: polish and non-critical behavior

## Existing Coverage Snapshot

Currently present:
- `cypress/component/ui/web/hooks/useNoteBulkActions.cy.tsx`
- `cypress/component/features/notes/NoteCard.cy.tsx`
- `cypress/component/features/notes/Sidebar.cy.tsx`

Gaps remain in SearchResultsPanel integration and AI-mode interaction cases.

## Automated Test Catalog

### A) Shared delete helper and hooks

- [ ] `P0` `SBD-HOOK-001`: `deleteNotesByIds([])` returns zeroed result and performs no mutation.
- [ ] `P0` `SBD-HOOK-002`: online delete calls mutation per id and returns `{ total, failed, queuedOffline: false }`.
- [ ] `P0` `SBD-HOOK-003`: partial failures increment `failed` and keep successful deletions applied.
- [ ] `P0` `SBD-HOOK-004`: invalidates both `['notes']` and `['aiSearch']` after completion.
- [ ] `P0` `SBD-HOOK-005`: clears selected note reference after completion.
- [ ] `P0` `SBD-HOOK-006`: offline path enqueues delete operations and marks overlay notes as pending/deleted.
- [ ] `P1` `SBD-HOOK-007`: `deleteSelectedNotes` exits sidebar selection mode on success.
- [ ] `P1` `SBD-HOOK-008`: `deleteSelectedNotes` keeps selection mode on thrown error.
- [ ] `P1` `SBD-HOOK-009`: `useBulkDeleteConfirm` opens dialog, calls callback only on confirm, and closes dialog after callback.
- [ ] `P1` `SBD-HOOK-010`: `useLongPress` triggers after delay, cancels on pointer move/up/leave/cancel.

### B) Selection UI components

- [ ] `P1` `SBD-COMP-001`: `SelectionModeActions` renders compact count and all actions.
- [ ] `P1` `SBD-COMP-002`: `SelectionModeActions` disables `Select all` and `Delete` per props.
- [ ] `P1` `SBD-COMP-003`: `SelectionModeActions` shows loading spinner in Delete when `deleting=true`.
- [ ] `P0` `SBD-COMP-004`: `BulkDeleteDialog` keeps confirm disabled until typed value exactly matches count.
- [ ] `P1` `SBD-COMP-005`: `BulkDeleteDialog` resets input when dialog closes.

### C) Card-level selection behavior

- [ ] `P1` `SBD-CARD-001`: `NoteCard` (compact) hover reveals checkbox when not in selection mode.
- [ ] `P1` `SBD-CARD-002`: `NoteCard` (search variant) hover reveals checkbox and title offset is correct.
- [ ] `P1` `SBD-CARD-003`: `NoteCard` card-click toggles selection only in selection mode; otherwise navigates.
- [ ] `P1` `SBD-CARD-004`: `NoteSearchItem` mirrors checkbox behavior and long-press entry.
- [ ] `P1` `SBD-CARD-005`: `NoteSearchItem` suppresses chunk navigation in selection mode and toggles selection instead.
- [ ] `P2` `SBD-CARD-006`: tag clicks are disabled in selection mode and active outside selection mode.

### D) SearchResultsPanel integration

- [ ] `P0` `SBD-PANEL-001`: panel enters selection mode from FTS result item.
- [ ] `P0` `SBD-PANEL-002`: panel enters selection mode from AI Notes item.
- [ ] `P0` `SBD-PANEL-003`: panel enters selection mode from tag-only result item.
- [ ] `P0` `SBD-PANEL-004`: `Select all` selects all currently visible ids in active path (FTS/tag-only/AI Notes).
- [ ] `P0` `SBD-PANEL-005`: delete action opens confirmation dialog; no delete before confirm.
- [ ] `P0` `SBD-PANEL-006`: confirm delete calls `deleteNotesByIds` with selected ids.
- [ ] `P0` `SBD-PANEL-007`: FTS/tag-only delete path calls `resetFtsResults()`.
- [ ] `P0` `SBD-PANEL-008`: AI Notes delete path calls `resetAIResults()`.
- [ ] `P1` `SBD-PANEL-009`: panel exits selection mode when selected count becomes zero.
- [ ] `P1` `SBD-PANEL-010`: panel keeps selection mode if delete result has failures.
- [ ] `P1` `SBD-PANEL-011`: visible-id reconciliation removes ids not present after result-set change.
- [ ] `P1` `SBD-PANEL-012`: `Delete (N)` disabled when `N=0` and during in-flight delete.
- [ ] `P1` `SBD-PANEL-013`: `Select all` disabled when all visible already selected.

### E) Sidebar integration

- [ ] `P0` `SBD-SIDEBAR-001`: sidebar no longer renders old `Select Notes` button; actions appear only in selection mode.
- [ ] `P0` `SBD-SIDEBAR-002`: sidebar uses shared confirmation dialog before bulk delete.
- [ ] `P0` `SBD-SIDEBAR-003`: sidebar `Select all` selects visible sidebar notes (not FTS data source).
- [ ] `P1` `SBD-SIDEBAR-004`: sidebar actions UI matches panel actions layout and labels.

### F) Cross-surface behavior and filter matrix

- [ ] `P0` `SBD-CROSS-001`: deleting from panel removes notes from sidebar after query invalidation.
- [ ] `P0` `SBD-CROSS-002`: deleting from sidebar removes notes from panel lists.
- [ ] `P0` `SBD-CROSS-003`: tag-only mode works with empty query.
- [ ] `P0` `SBD-CROSS-004`: query-only mode works with no tag.
- [ ] `P0` `SBD-CROSS-005`: query+tag mode applies combined filtering.
- [ ] `P1` `SBD-CROSS-006`: clearing tag returns to query-only behavior without stale selection.

### G) Mode-switch blocking and hint behavior

- [ ] `P1` `SBD-MODE-001`: AI toggle is blocked in panel selection mode.
- [ ] `P1` `SBD-MODE-002`: AI Notes/Chunks tabs are blocked in panel selection mode.
- [ ] `P1` `SBD-MODE-003`: blocked hint text is `Remove selection to switch`.
- [ ] `P1` `SBD-MODE-004`: desktop hint shows on hover and hides on mouse leave.
- [ ] `P1` `SBD-MODE-005`: mobile hint toggles on tap and closes on outside tap.
- [ ] `P1` `SBD-MODE-006`: AI info tooltip on mobile does not close instantly on first tap.

### H) AI pagination edge behavior in delete context

- [ ] `P0` `SBD-AI-001`: `loadMoreAI` appends cumulative results and updates existing note groups when refreshed.
- [ ] `P0` `SBD-AI-002`: change detection reacts to score/snippet changes, not only note ids.
- [ ] `P1` `SBD-AI-003`: after delete + `resetAIResults`, first page refetch has no deleted notes.

## Manual Test Catalog

- [ ] `P0` `SBD-MAN-001`: offline delete from panel queues operations and syncs after reconnect.
- [ ] `P0` `SBD-MAN-002`: deleting all visible results shows correct empty states (FTS and AI Notes).
- [ ] `P1` `SBD-MAN-003`: narrow-width panel keeps selection actions readable.
- [ ] `P1` `SBD-MAN-004`: mobile long-press behavior is reliable across iOS Safari and Android Chrome.
- [ ] `P2` `SBD-MAN-005`: keyboard-only traversal of selection actions and confirm dialog.

## Suggested Execution Order

1. Run all `P0` automated cases.
2. Run `P1` interaction cases.
3. Run manual `P0` cases (offline and empty-state).
4. Run browser/device spot checks.

## Exit Criteria

Feature is test-complete when:
- All `P0` automated tests pass.
- No unresolved failures in `P1` cases for target browsers.
- Manual `P0` scenarios are validated and documented.
