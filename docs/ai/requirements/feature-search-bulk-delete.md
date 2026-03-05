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
- Deleted notes must disappear from both the search panel and the main notes list automatically.

**Secondary goals:**
- Support the same offline/sync behaviour as the existing bulk delete (enqueue if offline).
- Keep the main-list selection mode fully intact (the "delete 3 recent notes" use case must still work).

**Non-goals:**
- Selection across both lists simultaneously (no cross-list shared selection state).
- AI search results bulk delete (RAG results show note groups with chunk fragments — selection UX is undefined; out of scope for now, FTS only).
- Undo / restore after deletion.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want to search for "meeting notes" and then select all results and delete them, so I can clean up a category of notes quickly.
- As a user, I want to select individual notes from search results, review my selection, and delete only the ones I choose.
- As a user, I want to filter notes by tag "#old", select all results, and delete them — with the tag filter staying active so I can see remaining notes with that tag after deletion.
- As a user, I want to delete the 3 most recently created notes (main list, no search) — this use case must be unaffected.
- As a user, when I delete notes from the search panel, I expect those notes to also disappear from the main list without a manual refresh.

**Edge cases:**
- Deleting while offline: must enqueue and show pending state.
- Deleting all results on the current page: panel should show empty state after refetch.
- Deleting a note that was loaded on page 2+ of FTS results (pagination): note should disappear on next refetch.
- Cancelling selection mode: all checkboxes clear, panel returns to normal view.

## Success Criteria
**How will we know when we're done?**

- [ ] Selection mode can be entered from within `SearchResultsPanel` when FTS results are visible.
- [ ] Checkboxes appear on FTS result cards when selection mode is active.
- [ ] "Select all" selects all currently loaded FTS results.
- [ ] "Delete selected (N)" button triggers bulk delete for selected note IDs.
- [ ] After deletion, both the search panel and the main notes list reflect the deletion without a page reload.
- [ ] Selection mode in the main list is unaffected.
- [ ] Offline deletion is enqueued correctly.
- [ ] No shared/conflicting state between the two selection contexts.
- [ ] "Delete selected" button is disabled (not hidden) when selection mode is active but 0 notes selected.
- [ ] Desktop: hovering a card reveals a checkbox in its corner; clicking enters selection mode + selects that card.
- [ ] Mobile: long press on a card enters selection mode + selects that card.
- [ ] When selection mode is active, results header transforms to show: "N selected", "Select all", "Delete (N)", "Cancel".
- [ ] After bulk delete with an active tag filter, the tag filter is preserved and results refetch with the same filter.

## Constraints & Assumptions
**What limitations do we need to work within?**

- **Two independent selection contexts**: search panel has its own `selectedIds`/`selectionMode` state; main list keeps its existing state from `useNoteSelection`. They do not share state.
- **Same delete mutation**: both contexts call the same `deleteNoteMutation` (and offline path). No new backend API needed.
- **Sync via React Query cache**: `queryClient.invalidateQueries({ queryKey: ['notes'] })` after deletion propagates to all queries under that namespace, including `useNotesQuery` (main list) and `useSearchNotes` (FTS panel). No manual cross-component event needed.
- **FTS accumulated results**: after deletion at `ftsOffset === 0`, the repopulation effect does a full replacement — deleted notes will vanish. For paginated results (offset > 0), a full reset (clear accumulated, reset offset) after deletion ensures consistency.
- AI search results are out of scope for selection/deletion.

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
