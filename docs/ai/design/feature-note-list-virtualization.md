---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- We will modify the `NoteList` component to use `react-window` for virtualization.
- `AutoSizer` (from `react-virtualized-auto-sizer`) will be used to determine the available width and height for the list within the sidebar.
- The component hierarchy:
  ```mermaid
  graph TD
    Sidebar --> ListPane
    ListPane --> NoteList
    NoteList --> AutoSizer
    AutoSizer --> List
    List --> NoteRow
    NoteRow --> NoteCard
  ```

> **Note:** We use `react-window` v2.x which has a different API than v1.x:
> - v1: `FixedSizeList`, `itemCount`, `itemSize`, `itemData`, `onItemsRendered`
> - v2: `List`, `rowCount`, `rowHeight`, `rowProps`, `onRowsRendered`, `rowComponent`

## Data Models
**What data do we need to manage?**

- No changes to the core `Note` data model.
- The `NoteList` component will continue to receive an array of `NoteRecord`.

## API Design
**How do components communicate?**

- **Props**: `NoteList` props remain largely the same, but internal implementation changes.
- **Scroll Events**: We listen to `onRowsRendered` from `List` (react-window v2) to detect when the user has scrolled near the bottom to trigger `onLoadMore`.

## Component Breakdown
**What are the major building blocks?**

- **`NoteList.tsx`**:
  - Wraps the list in `AutoSizer` to get dimensions.
  - Renders `List` from react-window v2 with `rowComponent` prop.
  - Handles the "Row" rendering logic via `NoteRow` component.
  - Uses `rowProps` to pass data (items, handlers, selection state) to rows.
- **`NoteCard.tsx`**:
  - Renders correctly within the fixed height container provided by `react-window`.
  - Uses `height: 100%` to fill the row.

## Design Decisions
**Why did we choose this approach?**

- **`react-window` v2**: Lightweight, modern virtualization library. Uses new API with `List`, `rowCount`, `rowHeight`, `rowProps`, `rowComponent`.
- **Fixed row height**: 130px for compact view, 160px for search results. Fixed heights offer best performance with truncated content.
- **`AutoSizer`**: Essential for making the list responsive to window resizing and sidebar width changes.
- **Type handling**: Due to potential TypeScript cache issues with react-window v1 types, we use `as any` cast with clear documentation.

## Non-Functional Requirements
**How should the system perform?**

- **Rendering**: Only visible items + overscan (buffer) should be in the DOM.
- **Memory**: Memory usage should remain stable regardless of list size.
- **Responsiveness**: Resizing the window should update the list dimensions immediately.

