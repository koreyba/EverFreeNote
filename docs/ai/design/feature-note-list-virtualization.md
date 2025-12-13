---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- We will modify the `NoteList` component to use `react-window` for virtualization.
- `AutoSizer` (from `react-virtualized-auto-sizer` or similar pattern) will be used to determine the available width and height for the list within the sidebar.
- The component hierarchy will change slightly:
  ```mermaid
  graph TD
    Sidebar --> ListPane
    ListPane --> NoteList
    NoteList --> AutoSizer
    AutoSizer --> FixedSizeList
    FixedSizeList --> NoteCardRow
    NoteCardRow --> NoteCard
  ```

## Data Models
**What data do we need to manage?**

- No changes to the core `Note` data model.
- The `NoteList` component will continue to receive an array of `NoteRecord`.

## API Design
**How do components communicate?**

- **Props**: `NoteList` props remain largely the same, but internal implementation changes.
- **Scroll Events**: We need to listen to `onItemsRendered` from `FixedSizeList` to detect when the user has scrolled near the bottom to trigger `onLoadMore`.

## Component Breakdown
**What are the major building blocks?**

- **`NoteList.tsx`**:
  - Will wrap the list in `AutoSizer` to get dimensions.
  - Will render `FixedSizeList`.
  - Will handle the "Row" rendering logic (passing style and data).
- **`NoteCard.tsx`**:
  - Needs to ensure it renders correctly within the fixed height container provided by `react-window`.
  - Should probably have `height: 100%` to fill the row.

## Design Decisions
**Why did we choose this approach?**

- **`react-window`**: It is a lightweight, modern alternative to `react-virtualized`. It is already a dependency.
- **`FixedSizeList`**: We will aim for a fixed item height (e.g., 100px or 120px) for the compact note card. This offers the best performance. If content is too long, it is already truncated in the current design.
- **`AutoSizer`**: Essential for making the list responsive to window resizing and sidebar width changes.

## Non-Functional Requirements
**How should the system perform?**

- **Rendering**: Only visible items + overscan (buffer) should be in the DOM.
- **Memory**: Memory usage should remain stable regardless of list size.
- **Responsiveness**: Resizing the window should update the list dimensions immediately.

