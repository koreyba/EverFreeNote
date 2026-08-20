---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Mobile Tag Management

## Problem

The mobile application already supports tags on individual notes, but it does not provide a top-level way to inspect, search, filter, rename, or delete the complete set of tags. The web application has a Tag Management page that establishes the product behavior and display conventions. Mobile needs an equivalent capability implemented with native React Native controls and an entry point in the main bottom navigation.

The bottom navigation also needs modern scroll behavior as part of this same feature: it is visible when a screen opens, hides while the user scrolls down, and reappears while the user scrolls up.

## Users and User Stories

- As a mobile user, I can open Tag Management directly from a dedicated `Tags` bottom tab.
- As a mobile user, I can see every tag and the number of notes using it, grouped alphabetically.
- As a mobile user, I can search tags and clear the search text with an inline X control.
- As a mobile user, I can tap a tag to open the existing note search filtered by that tag.
- As a mobile user, I can rename a tag across all affected notes, including when casing or whitespace differs.
- As a mobile user, I can delete a tag from all affected notes after confirming the action.
- As an offline user, I can manage tags using locally available data and have the changes synchronized when connectivity returns.
- As a mobile user, I see the bottom navigation when a tab opens; scrolling down hides it and scrolling up reveals it again.

## Goals

1. Add a dedicated top-level `Tags` bottom tab in the mobile app.
2. Build a native Tag Management screen aligned with the web behavior:
   - total tag count;
   - search with a clear X control;
   - alphabetical index supporting Latin, Cyrillic, and `#` groups;
   - grouped tag cards showing note counts;
   - navigation to notes filtered by the selected tag;
   - rename and delete actions.
3. Preserve the web domain semantics for tag normalization:
   - matching is case-insensitive;
   - replacement text is trimmed;
   - duplicate tags in a note are removed;
   - renaming into an existing tag is treated as a merge rather than creating duplicates.
4. Support optimistic local operation and eventual online synchronization without silently updating only the currently visible note page.
5. Make the bottom tab bar collapsible within this same feature and PR:
   - visible on initial screen render;
   - hidden after a downward scroll threshold;
   - shown after an upward scroll threshold;
   - shown again at the top of the scrollable content and when switching tabs.
6. Keep the experience accessible on Android and iOS, including labels, touch targets, safe-area handling, and readable loading/error/empty states.

## Non-Goals

- Reusing the web DOM, Tailwind classes, or shadcn components directly in React Native.
- Introducing a new mobile UI library solely for this screen.
- Redesigning the existing Settings sub-navigation.
- Changing unrelated note editing, search, or synchronization behavior.
- Building a new server-side tag table unless investigation proves the existing note-based model cannot provide correct operations.

## Functional Requirements

### Navigation and display

- `Tags` is a separate main bottom tab, alongside Notes, Search, and Settings.
- The screen loads the complete user tag summary and displays each tag's note count.
- Tag display casing follows the web convention: preserve the first-seen trimmed canonical display value while comparing case-insensitively.
- Tags are grouped and sorted using the same Latin/Cyrillic/`#` grouping and locale-aware ordering as the web experience.
- Tapping a tag opens the existing mobile search screen with that tag selected.

### Search and actions

- Search filters tags without changing the stored data.
- When search text is non-empty, an inline clear control removes it and restores the unfiltered list.
- Each tag card exposes Rename and Delete actions through native mobile interaction patterns.
- Rename requires trimmed non-empty text and confirms or clearly communicates merge behavior when the destination tag already exists.
- Delete requires confirmation and removes the tag case-insensitively from every affected note.

### Offline behavior

- The screen uses the existing local cache when offline and remains usable for cached data.
- Mutations update local data optimistically and are represented in the existing synchronization mechanism, or in a purpose-built queue extension if per-note queue entries cannot guarantee complete bulk-edit correctness.
- A failed synchronization attempt does not lose the user's local change and exposes retry/error state consistent with existing mobile sync behavior.
- After a mutation, tag summaries, note lists, and search results are invalidated or updated so stale counts do not remain visible.

### Collapsible bottom navigation

- The bottom tab bar is visible on initial render.
- A downward scroll hides the bar only after a small threshold, preventing jitter from tiny scroll events.
- An upward scroll reveals the bar after a small threshold.
- Reaching the top reveals the bar regardless of the previous state.
- Switching to another tab starts with the bar visible.
- Hiding/showing preserves safe-area behavior and does not make content or controls unreachable.

## Edge Cases

- Loading, empty, and error states are explicit and do not throw when the user has no tags or no authenticated user.
- A search with no matches shows a useful empty state and the exact search text.
- Clicking any alphabetical index letter selects that letter specifically; a second click on another letter must not merely toggle the previous selection off.
- A rename to the same tag after normalization is a no-op or a safe refresh, not a duplicate.
- A rename to an existing tag merges tags per note and removes duplicates.
- Whitespace-only rename input is rejected.
- Deleting the last tag leaves a valid empty state and a zero total.
- Offline data may be incomplete; the implementation must not claim a bulk operation is complete if the affected note set is incomplete. The chosen data/queue design must make this limitation explicit and safe.
- Rapid scroll direction changes must not leave the tab bar stuck hidden or visibly flickering.
- Keyboard, modal, and safe-area layout must work on both iOS and Android.

## Constraints

- Use the existing Expo Router, React Native, SQLite, React Query, theme, and offline-sync architecture.
- Prefer existing mobile primitives such as `Input`, `Button`, `TagChip`, and the current modal/alert conventions.
- Keep domain behavior in reusable core/service code rather than copying web JSX.
- Add behavioral tests for the new screen, mutations/offline behavior, and collapsible navigation.

## Success Criteria

- The `Tags` bottom tab opens a native Tag Management screen on Android and iOS.
- The screen matches web-visible tag semantics and supports search, clear, alphabetical navigation, filtered-note navigation, rename, and delete.
- Rename and delete affect the complete intended note set, both online and offline, with eventual synchronization and safe failure handling.
- Bottom navigation starts visible, hides on downward scrolling, and returns on upward scrolling or at the top.
- Focused tests cover the user-visible behavior, and mobile type-check/lint/tests pass.
- No existing Notes, Search, Settings, or offline-sync behavior regresses.

## Requirements Review Outcome

The product decisions are resolved:

- Mobile uses a separate top-level `Tags` tab.
- Tag Management is native rather than a reused web page.
- Offline operation is required.
- Display, casing, grouping, rename, delete, and merge semantics follow the web behavior.
- The collapsible bottom tab bar is part of this feature and the same PR. It starts visible, hides on downward scrolling, and shows on upward scrolling or at the top.

The technical decisions needed to make those requirements implementable are also resolved for the design phase:

- Online bulk operations will load the complete user's note set through a service-level query and filter tags case-insensitively in shared domain code. A paginated screen query is not an acceptable source of affected IDs.
- Offline rename/delete will use typed, idempotent bulk tag queue operations. Cached notes are updated immediately for responsiveness, while the queued operation remains authoritative and replays against the complete server-side set after reconnect. This avoids claiming that an incomplete local cache represents a complete bulk edit.
- The collapsible controller will be shared by the scrollable main tabs so navigation behaves consistently after switching screens. It will force visibility at offset zero and on tab focus.
- Initial implementation values are a 16 px accumulated direction threshold and a 180 ms native transition; these are implementation constants subject to platform smoke testing, not user-facing configuration.

Remaining risks are implementation concerns rather than unanswered product requirements: the cost of loading a complete note set for bulk operations, ordering bulk tag operations with queued note edits, and platform-specific tab-bar/safe-area animation behavior. The design and tests must address each explicitly.
