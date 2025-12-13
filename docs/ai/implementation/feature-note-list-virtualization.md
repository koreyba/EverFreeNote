---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Ensure `npm install` has been run.
- We will be working primarily in `ui/web/components/features/notes/NoteList.tsx`.

## Code Structure
**How is the code organized?**

- `NoteList` will wrap `AutoSizer` and `FixedSizeList`.
- We will define a `Row` component (or render function) that receives `{ index, style }` from `react-window`.
- Inside `Row`, we render `NoteCard`.

## Implementation Notes
**Key technical details to remember:**

### Virtualization Logic
- **Item Data**: We need to pass the `notes` array and other props (selection state, handlers) to the `itemData` prop of `FixedSizeList`. This avoids creating new function closures for every row on every render.
- **Infinite Scroll**: Use `onItemsRendered` to check if `visibleStopIndex` is close to `notes.length`. If so, call `onLoadMore`.
- **Sizing**: The `NoteCard` height needs to be fixed. Let's measure the current compact card. It looks like ~100px. We can make it configurable or just hardcode it for now.

### Patterns & Best Practices
- **Memoization**: `itemData` should be memoized with `useMemo` to prevent re-renders of the entire list when unrelated props change.
- **Style Passing**: The `style` prop passed to `Row` **MUST** be applied to the root element of the row (the wrapper around `NoteCard`) for positioning to work.

## Integration Points
**How do pieces connect?**

- **Sidebar**: The `Sidebar` component provides the container. We need to make sure the container has `height: 100%` or `flex: 1` so `AutoSizer` can measure it.

## Error Handling
**How do we handle failures?**

- If `AutoSizer` fails to measure (0 width/height), render a fallback or ensure CSS is correct.

## Performance Considerations
**How do we keep it fast?**

- **Overscan**: Set `overscanCount` to a reasonable number (e.g., 5) to prevent blank spaces during fast scrolling.
- **Keying**: `react-window` handles keys, but we should ensure our data is stable.

