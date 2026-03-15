---
phase: testing
title: Testing Strategy - Mobile Search Remote Delete Consistency
description: Test strategy for remote deletion reconciliation, offline fallback, and stale local cleanup on mobile
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% of new or changed code paths
- Integration test scope:
  - note opening after remote deletion
  - stale search cleanup
  - local fallback on transient failures
  - conflict-sensitive sync behavior
- End-to-end/manual scope:
  - cross-device delete from web then verify mobile behavior

## Unit Tests
**What individual components need testing?**

### Core note-read semantics
- [ ] Test case 1: missing remote note is classified as `not_found`
- [ ] Test case 2: network or timeout failures are classified as retryable/transient
- [ ] Additional coverage: unexpected error handling remains safe

### Mobile reconciliation helpers
- [ ] Test case 1: online `not_found` removes note from detail/list/search caches
- [ ] Test case 2: online `not_found` marks the local SQLite note deleted so it no longer appears in fallback queries
- [ ] Additional coverage: transient failures do not trigger destructive cleanup

## Integration Tests
**How do we test component interactions?**

- [ ] Search result selected after remote web deletion no longer opens as a normal note when online
- [ ] Search screen keeps query/tag context while removing the stale deleted note after manual refresh or repeated search
- [ ] Temporary server failure still allows local fallback and does not purge local data
- [ ] Pending local edits remain governed by the existing sync/conflict path and restore the locally edited version instead of being silently dropped

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: search on mobile, delete on web, manually refresh or repeat search, observe reconciliation
- [ ] User flow 2: open cached note while server is transiently unavailable, then later sync successfully
- [ ] User flow 3: tap stale deleted note before refresh, see deleted message, and return to prior context
- [ ] Critical path testing: online remote deletion versus offline fallback behave differently and correctly
- [ ] Regression of adjacent features: existing mobile delete and search UX remain intact

## Test Data
**What data do we use for testing?**

- Notes with tags and searchable text that appear in regular mobile search
- Cached local note rows in SQLite
- Mocked Supabase responses for:
  - found
  - not found
  - transient error
  - conflict-sensitive sync outcomes

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Root/core commands:
  - `npm run test:unit:core`
  - `npm run test:integration:core`
- Mobile commands:
  - `npm test -- --runInBand`
  - `npm run test:coverage`
- Coverage gaps and manual verification outcomes will be recorded in this document after implementation

## Manual Testing
**What requires human validation?**

- Deleted-note messaging in the mobile detail flow
- Search-screen behavior after manual refresh, repeated search, and full app reopen after remote deletion
- Cross-device behavior: delete on web while mobile app remains open
- Offline/online transition behavior with pending local edits

## Performance Testing
**How do we validate performance?**

- Confirm note opening does not noticeably regress due to added classification logic
- Confirm reconciliation does not cause visible search reset or unnecessary loading churn

## Bug Tracking
**How do we manage issues?**

- Log any mismatch between cache state, SQLite state, and remote truth as a dedicated consistency bug
- Track residual conflict-handling gaps separately if they exceed the feature scope
