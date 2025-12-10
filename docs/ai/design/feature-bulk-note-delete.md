---
phase: design
title: Bulk Delete Architecture
description: Technical architecture for selecting and deleting multiple notes across list and search views
---

# Bulk Delete — Architecture & Flows

## High-Level Flow
```mermaid
flowchart TD
  UI[Sidebar + NoteList + NoteCard] -->|selection toggles| Ctrl[useNoteAppController]
  Ctrl --> State[Selection state (mode, ids, counts)]
  Ctrl --> Data[Notes data (paged) + FTS data]
  Ctrl --> Actions[Bulk delete mutation\n(invalidated queries)]
  State --> Sidebar
  State --> NoteList
  Data --> Sidebar
  Data --> NoteList
  NoteList --> Cards[Cards (compact & search)] --> State
```

- Single source of truth in `useNoteAppController` for selection mode, selected ids, derived counts, and which dataset is currently shown (regular list vs FTS search results).
- UI components (sidebar controls, list, cards) are dumb: they render based on props and call controller handlers.
- Bulk delete runs per-id delete mutation in parallel, reports failures, invalidates the notes query, and exits selection mode.

## Views & Data Sources
- **Regular list (compact cards)**: paginated `notesQuery`; supports tag filter and simple search. Uses compact card layout.
- **FTS/advanced search (search cards)**: `useSearchNotes` result; supports tag filter on the client; cards show rank/markup. When FTS is active, selection operates on the FTS result set.
- **Counts**:
  - `totalNotes` comes from the first page `totalCount` (fallback to loaded count).
  - When FTS results are showing, the sidebar displays the filtered FTS total (after tag filter) to match visible items.
  - Selected count = size of `selectedNoteIds`.

## State & Handlers (controller)
- `selectionMode: boolean`, `selectedNoteIds: Set<string>`, `selectedCount`.
- `showFTSResults` computed from FTS query + method + data presence.
- `selectAllVisible()` selects ids from the currently visible dataset:
  - FTS active → use filtered FTS results.
  - Otherwise → use current regular list.
- `toggleNoteSelection(id)`: toggles id, forces selection mode on.
- `clearSelection()` resets set; `exitSelectionMode()` clears set and turns mode off.
- `deleteSelectedNotes()`: parallel delete for selected ids; shows toast on partial failure; invalidates notes and exits selection mode.

## UI Responsibilities
- **Sidebar**
  - Controls: enter/exit selection, select all / unselect all, delete selected (opens confirmation dialog), total notes display.
  - Settings dropdown (import/export) stays near user avatar/logout.
  - Shows total count matching the currently visible dataset (FTS vs regular).
- **NoteList**
  - Chooses dataset based on `showFTSResults`.
  - Passes selection props to cards for both compact and search variants.
  - Search header shows found count, execution time, and selection checkboxes.
- **NoteCard**
  - Compact and search variants render checkboxes when `selectionMode` is true.
  - Clicking card in selection mode toggles selection; clicking checkbox stops propagation.
  - Search variant keeps rank badge and sanitized highlighted snippet.
- **BulkDeleteDialog**
  - Requires the user to type the exact selected count before enabling Delete.

## Edge Cases & UX Rules
- Tag filter applies to both regular and FTS datasets; selection and counts respect the filtered set.
- FTS loading/empty states should hide selection controls in the list area (sidebar controls remain).
- If no visible notes, Select All is a no-op; Delete is disabled when nothing is selected.
- After deletion: exit selection mode, clear selection, invalidate notes, and leave search/filter inputs intact.

## Mobile & Accessibility
- Dropdown/menu align to the right edge of the sidebar and stay within viewport.
- Touch targets (checkboxes/buttons) ≥ 40px; tooltips are optional on mobile.
- Labels/ARIA: checkboxes have accessible names via the card title; buttons have clear text.

## Risks & Mitigations
- **Mismatched counts in FTS**: always derive sidebar total from the visible FTS results (after tag filter).
- **Selection drift on data refresh**: clear selection on exit; when new results load, `selectAllVisible` rebuilds from current data.
- **Partial delete failures**: report the number of failed deletions; keep mode exited to avoid stuck state; allow retry.
