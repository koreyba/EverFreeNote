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
- [x] Surfaces a relogin hint for `401 Unauthorized` row-action failures after switching local Supabase stacks
- [ ] Add a direct unit test for the virtualized empty-state copy if needed later

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
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/hooks/useAIIndexNotes.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/aiIndexNoteRow.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/aiIndexTab.test.tsx`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/settingsPage.aiIndex.test.tsx`
- Completed:
  - `npm run type-check:tests`
- Attempted:
  - `npm run type-check`
  - blocked by pre-existing errors in `cypress/component/features/notes/SearchResultsPanel.cy.tsx`

## Manual Testing

- Verify desktop and mobile Settings layouts
- Verify loading, empty, and error states
- Verify timestamps and status badges are understandable

## Performance Testing

- Confirm virtualization still works with large note counts
- Confirm infinite loading triggers before the user hits the end of the list

## Bug Tracking

- Remaining gaps:
  - no DB-backed RPC verification yet
  - no manual QA run yet
  - global `npm run type-check` is currently blocked by unrelated pre-existing Cypress type errors
