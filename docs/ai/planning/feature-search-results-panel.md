---
phase: planning
title: Project Planning & Task Breakdown (Search Results Panel)
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: State management & core shell integration
- [x] Milestone 2: Building the SearchResultsPanel component
- [x] Milestone 3: Drag-to-resize and mobile responsiveness

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation (State & Shell)
- [x] Task 1.1: Update `useNoteSearch` to include `isSearchPanelOpen` state and provide getter/setter. Link it to `handleSearch` so it auto-opens.
- [x] Task 1.2: Update `useNoteAppController` to expose the new search panel state to the UI.
- [x] Task 1.3: Update `Sidebar.tsx` to remove the actual search input and replace it with a button that triggers opening the search panel. Remove search rendering logic from the internal `NoteList` in Sidebar.

### Phase 2: Core Features (The Panel)
- [x] Task 2.1: Create `SearchResultsPanel.tsx` with a header, an independent text input for search, and a "Close" button.
- [x] Task 2.2: Extract the search-results part of `NoteList` into the new panel, passing down the FTS/Search data props.
- [x] Task 2.3: Integrate `SearchResultsPanel` into `NotesShell` between `Sidebar` and `EditorPane`. Control its visibility based on `isSearchPanelOpen`.

### Phase 3: Integration & Polish (Resize & Mobile)
- [x] Task 3.1: Add horizontal drag-to-resize logic (Resize Handle) to the right edge of `SearchResultsPanel`.
- [x] Task 3.2: Persist the panel's width to `localStorage` and read it on mount. Min-width 300px, max-width ~50% of viewport.
- [x] Task 3.3: Implement mobile view logic (when Search is open, hide Sidebar/Editor on mobile).

## Dependencies
**What needs to happen in what order?**
- Phase 1 must precede Phase 2.
- Phase 3 relies on a working panel from Phase 2.
- Testing updates should run after UI and controller integration stabilizes.
