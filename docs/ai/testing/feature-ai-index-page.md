---
phase: testing
title: AI Index Page - Testing Strategy
description: Test strategy for the Settings AI index page and its dedicated data flow
---

# Testing Strategy

## Test Coverage Goals

- Unit test all new hooks/services/components touched by the AI Index flow.
- Cover filter changes, ordinary search behavior, derived statuses, pagination, and row action refresh behavior.
- Record manual coverage for Settings navigation and responsive behavior.

## Unit Tests

### AI index data hook/service

- [x] Fetches first page correctly for the default filter
- [x] Passes the selected filter to the RPC request
- [x] Passes ordinary search params to the RPC request
- [x] Turns stale-schema `PGRST202` RPC failures into actionable migration guidance
- [x] Exposes `hasMore` / next page behavior correctly

### AI index row/list UI

- [x] Renders row actions for indexed and not-indexed states
- [x] Executes `Index` and `Remove from index` flows
- [x] Renders the search row and debounces search/filter updates together
- [x] Persists AI Index navigation state needed to return to the same Settings view
- [x] Opens a note when the AI Index row content is clicked
- [x] Uses clearer status-driven primary actions and hides non-actionable remove controls for not-indexed notes
- [x] Surfaces empty-state recovery actions for active search/filter combinations
- [x] Keeps the summary chrome compact enough that the note list stays above the fold on desktop and mobile
- [x] Keeps row height focused on title/status/actions rather than a large date-metadata block
- [x] Keeps row cards compact while preserving equal-width action buttons and avoiding status/title collisions on mobile
- [x] Removes the redundant main-content AI Index hero inside `Settings` so the page starts closer to the useful controls
- [x] Prefetches the main workspace route and first notes page so the first AI Index -> note transition avoids a completely cold start
- [x] Surfaces a relogin hint for `401 Unauthorized` row-action failures after switching local Supabase stacks
- [x] Restores saved AI Index filter/search state on mount and carries the current state into note navigation
- [x] Renders the AI Index error state with a retry affordance
- [x] Covers the direct `AIIndexList` empty-state passthrough branch

## Integration Tests

- [x] Settings route opens the `AI Index` tab when `tab=ai-index`
- [ ] Add a DB-backed verification for RPC-derived indexed / not indexed / outdated rows
- [ ] Add a rendered list integration test that verifies a row disappears from a filtered view after mutation

## End-to-End Tests

- [ ] Open `Settings -> AI Index`
- [ ] Switch between status filters
- [ ] Scroll enough to trigger lazy loading
- [ ] Reindex an outdated note and verify it leaves the `Outdated` filter
- [ ] Remove an indexed note and verify it becomes `Not indexed`

## Test Data

- Notes with no embeddings
- Notes with embeddings newer than `updated_at`
- Notes with embeddings older than `updated_at`

## Test Reporting & Coverage

- Completed:
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/aiIndexList.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/hooks/useAIIndexNotes.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/aiIndexNoteRow.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/aiIndexTab.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/lib/aiIndexNavigationState.test.ts`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/settingsPage.aiIndex.test.tsx`
- Completed:
  - `npm run type-check`
  - `npm run type-check:tests`
  - `npx eslint ui/web/components/features/settings/AIIndexTab.tsx ui/web/components/features/settings/AIIndexList.tsx ui/web/components/features/settings/AIIndexNoteRow.tsx ui/web/tests/unit/components/aiIndexNoteRow.test.tsx ui/web/tests/unit/components/aiIndexTab.test.tsx`
  - Browser QA in local Next dev server via Playwright: desktop auth-skip flow, `Settings -> AI Index`, empty-state flow, row open, browser back return, and mobile viewport snapshot review

## Manual Testing

- Verify desktop and mobile Settings layouts
- Verify loading, empty, and error states
- Verify timestamps and status badges are understandable
- Verify opening a note from `Settings -> AI Index`, then using browser back and mobile in-note back to return to the same filtered/scrolled AI Index view
- Verify the page still feels usable when there are only a few notes and when the current filter/search returns nothing

## Performance Testing

- Confirm virtualization still works with large note counts
- Confirm infinite loading triggers before the user hits the end of the list

## Bug Tracking

- Remaining gaps:
  - no DB-backed RPC verification yet
  - mobile/browser back behavior has browser QA coverage, but still lacks a dedicated automated end-to-end spec
