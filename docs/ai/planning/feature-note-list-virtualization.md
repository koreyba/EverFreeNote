---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Virtualization Prototype (Basic rendering with `react-window`)
- [ ] Milestone 2: Feature Parity (Selection, Infinite Scroll, Search)
- [ ] Milestone 3: Polish & Testing (Styling fixes, edge cases)

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Install `react-virtualized-auto-sizer` (if not present) or implement a size observer.
- [ ] Task 1.2: Refactor `NoteList` to use `FixedSizeList` with dummy data or simple rendering.
- [ ] Task 1.3: Determine the optimal fixed height for `NoteCard`.

### Phase 2: Core Features
- [ ] Task 2.1: Connect real `notes` data to the virtual list.
- [ ] Task 2.2: Implement `onItemsRendered` to trigger `onLoadMore` (Infinite Scroll).
- [ ] Task 2.3: Ensure `NoteCard` styling works correctly within the virtualized container (absolute positioning/style injection).

### Phase 3: Integration & Polish
- [ ] Task 3.1: Verify Selection Mode works (checkboxes, click handlers).
- [ ] Task 3.2: Verify Search Results (FTS) render correctly in the virtual list.
- [ ] Task 3.3: Handle "Loading" states and "Empty" states gracefully.
- [ ] Task 3.4: Fix any z-index or overflow issues with dropdowns/menus inside the list (though `NoteCard` doesn't seem to have complex popups).

## Dependencies
**What needs to happen in what order?**

- `react-window` is required.
- `AutoSizer` logic is required before the list can render correctly in the flex layout.

## Timeline & Estimates
**When will things be done?**

- **Effort**: ~2-3 hours.
- **Risk**: High complexity in getting `AutoSizer` to play nice with the existing flexbox layout of the Sidebar.

## Risks & Mitigation
**What could go wrong?**

- **Layout Issues**: The virtual list might collapse to 0 height if the parent container doesn't have a defined height.
  - *Mitigation*: Ensure the parent container in `Sidebar` has `flex: 1` and `overflow: hidden`, and `AutoSizer` is the direct child.
- **Scroll Position Loss**: When navigating away and back, scroll position might be lost.
  - *Mitigation*: We might need to save/restore scroll offset, but for now, standard behavior is acceptable.

## Resources Needed
**What do we need to succeed?**

- `react-window` documentation.
- Existing `NoteList` code.

