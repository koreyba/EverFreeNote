---
phase: requirements
title: Requirements & Problem Understanding - Search Results Note Deletion
description: Enable note deletion directly from search results on mobile via swipe-to-delete
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Users on mobile can delete notes from the main notes list but cannot delete notes from search results.
- This creates an inconsistent UX: after finding a note via search, users must navigate back to the main list to delete it.
- Affected users: All mobile app users who use the search functionality.
- Current workaround: Navigate to the main notes list, find the note again, and delete from there.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals: Enable swipe-to-delete for notes in search results, matching the behavior of the main notes list.
- Secondary goals: Maintain UX consistency across the app.
- Non-goals:
  - Bulk deletion from search results (out of scope).
  - Adding delete functionality to other screens beyond search.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want to swipe a note in search results to reveal a delete button so I can quickly remove unwanted notes without leaving search.
- As a user, I want the deletion in search results to behave identically to the main list (immediate delete, no confirmation per existing requirements).
- As a user, I want the search results to update immediately after deleting a note.

Key workflows:
1. User searches for a note
2. User swipes left on a search result
3. Delete button appears
4. User taps delete
5. Note is removed from results and deleted from storage

Edge cases:
- Deleting the last result should show "Nothing found" message
- Active tag filter should be preserved after deletion
- Search query should be preserved after deletion

## Success Criteria
**How will we know when we're done?**

- Users can delete a note via swipe action in search results (identical to main list behavior).
- Deleted notes are immediately removed from search results UI.
- Deleted notes are removed from both local (SQLite) and remote (Supabase) storage.
- Immediate deletion without confirmation dialog (consistent with existing deletion behavior).
- Search query and tag filter remain active after deletion.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints:
  - Must reuse existing `SwipeableNoteCard` component.
  - Must reuse existing `useDeleteNote` hook.
  - Must work with `FlashList` (already proven in main list).
  - Must integrate with existing `SwipeContext` for proper swipe handling.
- Assumptions:
  - The search results cache will be properly invalidated by the existing `useDeleteNote` hook.
  - `SwipeableNoteCard` supports `variant="search"` display via the inner `NoteCard`.

## Implementation Notes

The implementation should be straightforward:
1. Replace `NoteCard` with `SwipeableNoteCard` in `search.tsx`
2. Add `useDeleteNote` hook usage
3. Add `useSwipeContext` for swipe coordination
4. Add `handleDeleteNote` callback with error handling
5. Update `renderItem` to use `SwipeableNoteCard` with `onDelete` prop

Existing infrastructure to reuse:
- [SwipeableNoteCard.tsx](ui/mobile/components/SwipeableNoteCard.tsx) - swipeable wrapper
- [useDeleteNote hook](ui/mobile/hooks) - deletion mutation with cache invalidation
- [SwipeContext](ui/mobile/providers) - swipe coordination between cards
- [index.tsx](ui/mobile/app/(tabs)/index.tsx) - reference implementation

## Questions & Open Items
**What do we still need to clarify?**

- None - this is a direct feature parity implementation with the main notes list.
