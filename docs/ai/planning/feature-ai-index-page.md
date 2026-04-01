---
phase: planning
title: AI Index Page - Planning
description: Task breakdown for the Settings AI index management page
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Feature docs and server-side AI index list query are in place
- [x] Milestone 2: `Settings -> AI Index` tab renders filtered, virtualized note rows
- [x] Milestone 3: Row actions refresh list state correctly and tests cover the new flow
- [x] Milestone 4: AI Index supports ordinary note search semantics below the status tabs

## Task Breakdown

### Phase 1: Data flow and server support

- [x] Task 1.1: Add a dedicated server-side AI index list fetch path
  - Implemented as Postgres RPC `get_ai_index_notes`
  - Returns note title, updated timestamp, latest indexed timestamp, derived status
  - Supports filter + pagination inputs
- [x] Task 1.2: Add core/web types for AI index list rows and filter values
- [x] Task 1.3: Create a dedicated web hook/query for paginated AI index data

### Phase 2: Settings UI

- [x] Task 2.1: Extend `SettingsPage` with `AI Index` tab metadata and rendering path
- [x] Task 2.2: Create `AIIndexTab` with header, filter controls, empty/loading states
- [x] Task 2.3: Create `AIIndexList` with virtualization, dynamic row heights, and autoload on scroll
- [x] Task 2.4: Create dedicated `AIIndexNoteRow` / card component without reusing `NoteCard`
- [x] Task 2.5: Add the ordinary search row beneath AI Index status filters

### Phase 3: Actions, refresh, and polish

- [x] Task 3.1: Reuse `rag-index` actions for Index/Reindex/Remove from index on each row
- [x] Task 3.2: Refresh or invalidate AI index queries after row mutations
- [x] Task 3.3: Add status-specific button labels, timestamps, and disabled states
- [x] Task 3.4: Document implementation and testing outcomes in feature docs
- [x] Task 3.5: Reuse ordinary note-search semantics in the AI Index RPC and hook
- [x] Task 3.6: Make AI Index rows open notes and restore the same Settings state on back navigation
- [x] Task 3.7: Refine AI Index information hierarchy so summary, filters, search, and list state are easier to scan
- [x] Task 3.8: Refine row-level UX with clearer status meaning, stronger primary actions, and less disabled-button noise
  - Follow-up refinement kept the compact header but reverted a too-rigid desktop table rhythm back to a more flexible card layout so titles stay readable on desktop and mobile.

## Dependencies

- Existing `rag-index` Edge Function remains the mutation layer.
- Existing `note_embeddings` schema and RLS policies remain the source of truth for AI index status.
- The new fetch flow depends on Supabase auth being available in the browser to call the dedicated RPC.

## Timeline & Estimates

- Phase 1: medium
- Phase 2: medium
- Phase 3: medium

Total expected effort: 1 focused implementation cycle with follow-up testing and review.

## Risks & Mitigation

- Incorrect status filtering with browser-only aggregation
  - Mitigation: compute aggregated status on the server before pagination.
- Search semantics drifting from the main notes experience
  - Mitigation: reuse the shared debounce/min-length/ts-query rules in the AI Index hook and RPC contract.
- Virtualization regressions inside Settings layout
  - Mitigation: mirror `NoteList` sizing and scrolling patterns in a dedicated component.
- Query refresh race after row mutations
  - Mitigation: centralize invalidation in the AI index hook/query key.

## Resources Needed

- Existing web settings layout styles and UI primitives
- Existing `rag-index` mutation flow
- Component and hook test coverage around list state, filters, and row actions
