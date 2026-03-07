---
phase: requirements
title: Requirements & Problem Understanding (Search Bulk Delete)
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Before `SearchResultsPanel` was introduced, the main notes list accepted a search query (`ILIKE`-based) that filtered notes in place. Users could find notes via search and then bulk-select and delete them.
- When `SearchResultsPanel` was added, the main list was decoupled from the search query (hardcoded to `''`) to keep it stable. Search results now live exclusively in the panel.
- Bulk selection and deletion remained only on the main (unfiltered) list. Users lost the ability to **search for notes and then bulk-delete the results**.
- Affected users: all users who want to clean up notes by topic, tag, or keyword.

Current workaround: manually scroll the main list, identify notes visually, then select and delete — no search-assisted workflow.

## Goals & Objectives
**What do we want to achieve?**

**Primary goals:**
- Allow users to enter selection mode inside `SearchResultsPanel` and bulk-delete FTS search results.
- Allow users to enter selection mode inside `SearchResultsPanel` and bulk-delete AI Notes view results.
- Deleted notes must disappear from both the search panel and the main notes list automatically.

**Secondary goals:**
- Support the same offline/sync behaviour as the existing bulk delete (enqueue if offline).
- Keep the main-list selection mode fully intact (the "delete 3 recent notes" use case must still work).

**Non-goals:**
- Selection across both lists simultaneously (no cross-list shared selection state).
- AI search **Chunks view** bulk delete (chunk fragments don't map cleanly to individual notes — out of scope).
- Undo / restore after deletion.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want to search for "meeting notes" (FTS or AI Notes view) and then select all results and delete them, so I can clean up a category of notes quickly.
- As a user, I want to select individual notes from FTS or AI Notes results, review my selection, and delete only the ones I choose.
- As a user, I want to filter notes by tag "#old", select all results, and delete them — with the tag filter staying active so I can see remaining notes with that tag after deletion.
- As a user, I want to delete the 3 most recently created notes (main list, no search) — this use case must be unaffected.
- As a user, when I delete notes from the search panel, I expect those notes to also disappear from the main list without a manual refresh.

**Edge cases:**
- Deleting while offline: must enqueue and show pending state.
- Deleting all results on the current page: panel should show empty state after refetch.
- Deleting a note that was loaded on page 2+ of FTS results (pagination): note should disappear on next refetch.
- Deleting a note that was loaded on page 2+ of AI Notes results (pagination): same behaviour — note disappears on next refetch after accumulated results reset.
- Cancelling selection mode: all checkboxes clear, panel returns to normal view.
- Attempting to switch search mode (FTS ↔ AI) while selection is active: the toggle must be disabled; a tooltip explains why.

## Success Criteria
**How will we know when we're done?**

**FTS results:**
- [ ] Selection mode can be entered from within `SearchResultsPanel` when FTS results are visible.
- [ ] Checkboxes appear on FTS result cards when selection mode is active.
- [ ] "Select all" selects all currently loaded FTS results.

**AI Notes view:**
- [ ] Selection mode can be entered from within `SearchResultsPanel` when AI Notes view results are visible.
- [ ] Checkboxes appear on AI Notes result cards when selection mode is active.
- [ ] "Select all" selects all currently loaded AI Notes results.
- [ ] AI Notes view uses the same infinite-scroll / pagination pattern as FTS (accumulated results, load-more).
- [ ] After bulk delete from AI Notes view, accumulated results reset and the first page refetches cleanly.
- [ ] Chunks view (AI search) shows no selection UI — out of scope.

**Shared behaviour (search panel + main list):**
- [ ] "Delete selected (N)" button triggers bulk delete for selected note IDs.
- [ ] After deletion, both the search panel and the main notes list reflect the deletion without a page reload.
- [ ] Selection mode in the main list is unaffected by panel selection mode.
- [ ] Offline deletion is enqueued correctly.
- [ ] No shared/conflicting state between the two selection contexts.
- [ ] "Delete selected" button is disabled (not hidden) when selection mode is active but 0 notes selected.
- [ ] Desktop: hovering any note card (in search panel or main list) reveals a checkbox in its corner; clicking enters selection mode + selects that card.
- [ ] Mobile: long press on any note card (in search panel or main list) enters selection mode + selects that card.
- [ ] When selection mode is active, results header transforms to show: "N selected", "Select all", "Delete (N)", "Cancel".
- [ ] After bulk delete with an active tag filter, the tag filter is preserved and results refetch with the same filter.

**Mode-switch blocking:**
- [ ] The FTS ↔ AI search mode toggle (`AiSearchToggle`) is disabled when `panelSelectionMode` is true.
- [ ] The AI Notes / Chunks view tabs are disabled when `panelSelectionMode` is true.
- [ ] A tooltip on the disabled toggle reads: "Remove selection to switch".
- [ ] Cancelling selection mode re-enables the toggle immediately.

## Constraints & Assumptions
**What limitations do we need to work within?**

- **Two independent selection contexts**: search panel has its own `selectedIds`/`selectionMode` state; main list keeps its existing state from `useNoteSelection`. They do not share state.
- **Same delete mutation**: both contexts call the same `deleteNoteMutation` (and offline path). No new backend API needed.
- **Sync via React Query cache**: `deleteNotesByIds` calls both `queryClient.invalidateQueries({ queryKey: ['notes'] })` (covers main list + FTS) and `queryClient.invalidateQueries({ queryKey: ['aiSearch'] })` (covers AI Notes / Chunks). Every list that could display a deleted note is covered. No manual cross-component event needed.
- **FTS accumulated results**: after deletion at `ftsOffset === 0`, the repopulation effect does a full replacement — deleted notes will vanish. For paginated results (offset > 0), a full reset (clear accumulated, reset offset) after deletion ensures consistency.
- **Single panel selection state**: `panelSelectionMode`/`panelSelectedIds` is shared across FTS and AI Notes views within the same panel. The selection state covers whichever results are currently visible.
- **AI Notes pagination mirrors FTS**: AI Notes view uses the same accumulated-results + load-more pattern as FTS (new `useAIPaginatedSearch` hook). After bulk delete, `resetAIResults()` clears accumulation and `queryClient.invalidateQueries(['aiSearch'])` triggers a clean first-page refetch.
- **Mode-switch blocking**: switching between FTS and AI search modes is disabled while `panelSelectionMode` is true. The user must cancel selection first. This prevents ambiguity about which result set the selected IDs belong to.
- AI search **Chunks view** is out of scope for selection/deletion (chunk fragments don't map cleanly to individual notes).

## Questions & Open Items
**What do we still need to clarify?**

- Should "Select all" in the search panel select only the loaded page, or trigger loading all pages first? → Assume loaded page only (consistent with main list behaviour).
- ~~Should selection mode in the search panel be triggered by a dedicated button, or by long-pressing a card?~~ → **No dedicated "Select" button.** Entry is via the card itself:
  - **Desktop**: hover on a card reveals a checkbox in the corner; clicking it enters selection mode and selects that card.
  - **Mobile**: long press on a card enters selection mode and selects that card.
  - When selection mode is active, the results header transforms: shows "N selected", "Select all", "Delete (N)" [disabled at 0], "Cancel".
- Should the panel close after bulk deletion, or stay open with updated results? → Stay open, show updated results.
- ~~What should the "Delete" button show when 0 notes are selected?~~ → **Disabled (greyed out)** while selection mode is active but nothing is selected.
- ~~What happens to the tag filter after bulk delete?~~ → **Tag filter is preserved.** Panel refetches with the same tag filter active, showing remaining notes with that tag.
- ~~Does AI Notes view support selection?~~ → **Yes.** AI Notes view gets selection mode identical to FTS. Chunks view does not.
- ~~What happens when the user tries to switch FTS ↔ AI while selection is active?~~ → **Toggle is blocked.** The `AiSearchToggle` and AI Notes/Chunks view tabs are disabled with a tooltip: "Remove selection to switch". Selection must be cancelled first.
