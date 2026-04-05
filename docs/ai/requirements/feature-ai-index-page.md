---
phase: requirements
title: AI Index Page
description: Settings tab for inspecting and manually managing per-note AI index state
---

# Requirements & Problem Understanding

## Problem Statement

Users can currently index or delete the AI/RAG index only from inside an individual note via `RagIndexPanel`. There is no central place in Settings to understand which notes are indexed, which were never indexed, and which became stale after edits.

- Affected users: web and mobile users who actively manage AI search quality and want explicit control over note indexing coverage.
- Current workaround: open notes one by one and inspect per-note indexing controls.
- Pain points:
  - No overview of indexing coverage across the workspace.
  - No fast way to find stale notes that need reindexing.
  - No manual bulk workflow for reviewing index health from Settings.

## Goals & Objectives

### Primary goals

- Add a dedicated `AI Index` tab under `Settings`.
- Add a search row under the status tabs that reuses the ordinary note-search behavior for narrowing the list.
- Show a paginated/virtualized list of notes with index metadata:
  - `title`
  - `status`
  - `last indexed at`
- Allow filtering by `Indexed`, `Not indexed`, and `Outdated`.
- Allow manual per-note actions:
  - `Index`
  - `Reindex`
  - `Remove from index`
- Add a bulk action button near the list summary that indexes only the current loaded result set for the active filter and active search.

### Secondary goals

- Preserve the existing settings visual language and navigation behavior on desktop and mobile.
- Reuse the performance principles already proven in `NoteList`:
  - virtualization
  - dynamic row heights
  - lazy loading / pagination
  - autoload on scroll
- Keep the feature isolated from the notes/search controller stack by using a dedicated flow, hook/query, and row/card component.

### Non-goals

- Replacing the existing per-note `RagIndexPanel` entry points.
- A whole-workspace "index every note" action that ignores pagination, loaded state, or active search results.
- Editing note content from the AI Index page.
- ~~Mobile-specific AI Index screen beyond preserving responsive Settings behavior.~~ (Resolved: mobile AI Index screen is now in scope and implemented.)
- Automatic reindex on note save.

## User Stories & Use Cases

- As a user, I want to open `Settings -> AI Index` and immediately see which notes are part of the AI index.
- As a user, I want to filter to `Outdated` notes so I can quickly reindex stale content.
- As a user, I want to filter to `Not indexed` notes so I can decide what should enter the AI index.
- As a user, I want to reindex an outdated or already indexed note without opening it first.
- As a user, I want to remove a note from the AI index from the same list view.
- As a user, I want one bulk button that indexes only the notes currently loaded in the visible AI Index list, so search and filters naturally limit its scope.

### Status rules

- `Indexed`: note has embeddings and the latest `indexed_at` is newer than or equal to the note `updated_at`.
- `Not indexed`: note has no embeddings.
- `Outdated`: note has embeddings, but the note `updated_at` is newer than the latest `indexed_at`.

### Edge cases

- Notes with no embeddings must still appear in the list and filter correctly.
- Notes with many embeddings still show one row with the latest `indexed_at`.
- Actions must disable while a note-level request is in flight to avoid duplicate submissions.
- Reindex should update the row state immediately after the operation, without requiring a full page refresh.
- Empty filter results should explain the current state clearly.

### Default page behavior

- The page initially shows all notes, then narrows the result set when a status filter is selected.
- The page also supports the same ordinary text-search semantics as the main notes flow:
  - the search row sits below the status tabs
  - search starts after 3 characters
  - matching should follow the ordinary note search path (`FTS` first, then substring fallback)
- The default sort order is descending by note `updated_at` so the most recently changed notes are reviewed first.
- The bulk action must use the same narrowed list the user is looking at:
  - only notes from the active filter and active committed search query are eligible
  - only notes already loaded into the current infinite list are eligible
  - notes on later, not-yet-loaded pages must not be indexed
  - notes excluded by search must not be indexed
  - already indexed notes may stay visible in `All notes`, but the bulk action should skip them rather than reprocessing them unless they are `Outdated`

## Success Criteria

- [ ] `Settings` contains a new `AI Index` tab.
- [ ] The page renders a virtualized list of notes with dynamic row heights.
- [ ] The list supports infinite scrolling / lazy pagination with automatic load-more near the end.
- [ ] Filter changes reload data for the selected status and reset pagination correctly.
- [ ] Search query changes reload AI index data without breaking pagination or virtualization.
- [ ] Each row shows `title`, computed status, and `last indexed at` when available.
- [ ] `Index`, `Reindex`, and `Remove from index` actions are available according to row state.
- [ ] A bulk button is available in the AI Index summary/header area on web and mobile when the current loaded result set contains actionable notes.
- [ ] The bulk button affects only the currently loaded notes that match the active filter and active committed search query.
- [ ] After an action completes, the affected row reflects the new status without leaving the page.
- [ ] `Outdated` status is computed from actual note update time versus latest index time.
- [ ] The implementation does not directly reuse `NoteCard` or the existing notes/search controller flow.

## Constraints & Assumptions

### Technical constraints

- The web app is a static SPA, so server-side list aggregation must use Supabase primitives already used by the project.
- Existing `rag-index` Edge Function remains the source of truth for index/delete/reindex actions.
- Browser-side reads of `note_embeddings` are limited by RLS and are awkward for server-side status filtering at scale.
- Status filtering must remain performant for large note sets and should not require fetching the full workspace into the browser first.
- The bulk action should reuse the existing single-note `rag-index` mutation path rather than introducing a whole new backend bulk API for this refinement.

### Assumptions

- The current authenticated user is the only scope for notes and embeddings in this view.
- `note.updated_at` and latest embedding `indexed_at` are sufficient to derive the `Outdated` state for MVP.
- A dedicated AI-index list endpoint or equivalent server-side query path is acceptable because it keeps filtering and pagination correct.

## Mobile Platform Extension

### Problem

The web AI Index page solved the desktop experience. Mobile users on the React Native app have the same problem: no central place to review and manage note indexing status.

### Mobile-specific goals

- Add an `AI Index` tab to the mobile Settings screen (`ui/mobile/app/(tabs)/settings.tsx`).
- Reuse the same backend RPC (`get_ai_index_notes`) and Edge Function (`rag-index`) — no new server work.
- Provide the same filter chips (All / Indexed / Not indexed / Outdated), search input, and per-note actions (Index / Reindex / Update index / Remove index).
- Provide the same summary-area bulk action on mobile, with identical "loaded notes only" and "respect active search/filter" semantics.
- Use `FlatList` with pull-to-refresh and infinite scroll (not `react-window` — React Native).
- Follow mobile UI patterns: `StyleSheet.create`, `useTheme()`, `memo()`, `Toast.show()`.

### Mobile non-goals

- Virtualization with `react-window` (web-only; FlatList handles this natively).
- Opening notes from the AI Index card (mobile settings doesn't have the same navigation bridge).
- Optimistic row animations on mutation (simplified: invalidate query cache instead).

### Mobile user stories

- As a mobile user, I want to open Settings → AI Index and see all my notes with their indexing status.
- As a mobile user, I want to search and filter notes by status on my phone.
- As a mobile user, I want to index/reindex/remove notes from the AI index without opening each note.

### Mobile success criteria

- [x] Mobile Settings contains a new `AI Index` tab.
- [x] The tab renders a scrollable list of notes with status badges.
- [x] Filter chips narrow the list by status.
- [x] Search input filters notes with debounce (300ms, 3-char minimum).
- [x] Each card shows title, status badge, status description, and action buttons.
- [x] Actions call `rag-index` and show toast on success/error.
- [x] A bulk button appears in the summary area and processes only the currently loaded, search-filtered mobile cards that still need indexing.
- [x] Pull-to-refresh and infinite scroll work correctly.
- [x] Loading, empty, and error states are handled.
- [x] 21 unit tests cover the hook, card, and panel components.

## Questions & Open Items

- None for MVP. The status model, actions, and page placement are sufficiently defined to implement.
- Mobile extension is complete and tested.
