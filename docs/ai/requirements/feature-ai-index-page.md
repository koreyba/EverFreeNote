---
phase: requirements
title: AI Index Page
description: Settings tab for inspecting and manually managing per-note AI index state
---

# Requirements & Problem Understanding

## Problem Statement

Users can currently index or delete the AI/RAG index only from inside an individual note via `RagIndexPanel`. There is no central place in Settings to understand which notes are indexed, which were never indexed, and which became stale after edits.

- Affected users: web users who actively manage AI search quality and want explicit control over note indexing coverage.
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
- Bulk actions on multiple notes in MVP.
- Editing note content from the AI Index page.
- Mobile-specific AI Index screen beyond preserving responsive Settings behavior.
- Automatic reindex on note save.

## User Stories & Use Cases

- As a user, I want to open `Settings -> AI Index` and immediately see which notes are part of the AI index.
- As a user, I want to filter to `Outdated` notes so I can quickly reindex stale content.
- As a user, I want to filter to `Not indexed` notes so I can decide what should enter the AI index.
- As a user, I want to reindex an outdated or already indexed note without opening it first.
- As a user, I want to remove a note from the AI index from the same list view.

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

## Success Criteria

- [ ] `Settings` contains a new `AI Index` tab.
- [ ] The page renders a virtualized list of notes with dynamic row heights.
- [ ] The list supports infinite scrolling / lazy pagination with automatic load-more near the end.
- [ ] Filter changes reload data for the selected status and reset pagination correctly.
- [ ] Search query changes reload AI index data without breaking pagination or virtualization.
- [ ] Each row shows `title`, computed status, and `last indexed at` when available.
- [ ] `Index`, `Reindex`, and `Remove from index` actions are available according to row state.
- [ ] After an action completes, the affected row reflects the new status without leaving the page.
- [ ] `Outdated` status is computed from actual note update time versus latest index time.
- [ ] The implementation does not directly reuse `NoteCard` or the existing notes/search controller flow.

## Constraints & Assumptions

### Technical constraints

- The web app is a static SPA, so server-side list aggregation must use Supabase primitives already used by the project.
- Existing `rag-index` Edge Function remains the source of truth for index/delete/reindex actions.
- Browser-side reads of `note_embeddings` are limited by RLS and are awkward for server-side status filtering at scale.
- Status filtering must remain performant for large note sets and should not require fetching the full workspace into the browser first.

### Assumptions

- The current authenticated user is the only scope for notes and embeddings in this view.
- `note.updated_at` and latest embedding `indexed_at` are sufficient to derive the `Outdated` state for MVP.
- A dedicated AI-index list endpoint or equivalent server-side query path is acceptable because it keeps filtering and pagination correct.

## Questions & Open Items

- None for MVP. The status model, actions, and page placement are sufficiently defined to implement.
