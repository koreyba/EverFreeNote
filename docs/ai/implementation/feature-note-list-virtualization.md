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

- `NoteList` wraps `AutoSizer` and `List` (react-window v2).
- `NoteRow` is a memoized component that receives `{ index, style, ...rowProps }` from react-window v2.
- Inside `NoteRow`, we render `NoteCard`.

## Implementation Notes
**Key technical details to remember:**

### Virtualization Logic (react-window v2 API)
- **Row Props**: Pass the `notes` array and other props (selection state, handlers) via `rowProps`. This is passed to `NoteRow` component along with `index` and `style`.
- **Infinite Scroll**: Use `onRowsRendered` to check if `stopIndex` is close to `items.length`. If so, call `onLoadMore`.
- **Sizing**: Row heights are fixed: 130px for compact view, 160px for search results.

### Patterns & Best Practices
- **Memoization**: `rowProps` (itemData) is memoized with `useMemo` to prevent re-renders when unrelated props change.
- **Style Passing**: The `style` prop passed to `NoteRow` **MUST** be applied to the root element for positioning to work.
- **Type Safety**: Due to TypeScript caching old react-window v1 types, we use `List as any` with documentation comment.

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

