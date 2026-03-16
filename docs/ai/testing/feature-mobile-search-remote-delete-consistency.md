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
- [x] Test case 1: missing remote note is classified as `not_found`
- [x] Test case 2: network or timeout failures are classified as retryable/transient
- [ ] Additional coverage: unexpected error handling remains safe

### Mobile reconciliation helpers
- [ ] Test case 1: online `not_found` removes note from detail/list/search caches
- [x] Test case 2: online `not_found` marks the local SQLite note deleted so it no longer appears in fallback queries
- [ ] Additional coverage: transient failures do not trigger destructive cleanup

## Integration Tests
**How do we test component interactions?**

- [x] Search result selected after remote web deletion no longer opens as a normal note when online
- [x] Search screen keeps query/tag context while dropping the stale deleted note after manual refresh or repeated search
- [ ] Already-open search results are allowed to keep stale entries before refresh, but stale opens must fail safely with the deleted-note message. After returning from the alert, the stale item may remain in the list until the next confirmed refresh point (manual refresh, cold start, or repeated search).
- [x] AI search result selected after remote web deletion shows the deleted-note message and no longer opens as a normal note
- [ ] Temporary server failure still allows local fallback and does not purge local data
- [ ] Pending local edits win over remote deletion: the note is restored from the locally edited version instead of being silently dropped
- [ ] Bulk delete silently skips already-deleted notes and completes the operation for the remaining ones without error messages

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: search on mobile, delete on web, manually refresh or repeat search, observe reconciliation
- [ ] User flow 2: open cached note while server is transiently unavailable, then later sync successfully
- [ ] User flow 3: tap stale deleted note before refresh, see deleted message, return to prior context, confirm stale item remains visible until next refresh
- [ ] User flow 4: repeat the same stale-open and refreshed-result behavior through AI search (both note view and chunk view)
- [ ] User flow 5: delete note on mobile, verify web app handles it correctly (stale-open guard, deleted-note toast)
- [ ] User flow 6: bulk delete selection including already-deleted notes — operation completes silently for remaining notes
- [ ] Critical path testing: online remote deletion versus offline fallback behave differently and correctly. Cold start clears stale data; background-to-foreground does not.
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
- Executed during implementation:
  - `npm run test:unit:core -- core/tests/unit/core-services-notes-getNoteStatus.test.ts`
  - `npm test -- --runInBand ui/mobile/tests/component/useOpenNote.test.tsx`
  - `npm test -- --runInBand ui/mobile/tests/component/searchResultsList.test.tsx`
  - `npm test -- --runInBand ui/mobile/tests/integration/noteEditorScreen.test.tsx`
  - `npm test -- --runInBand ui/mobile/tests/integration/searchScreen.test.tsx`
  - `npm test -- --runInBand ui/mobile/tests/integration/searchScreenAI.test.tsx`
  - `npm run type-check` in `ui/mobile`
- Executed during follow-up consistency fix:
  - `npx jest --config jest.config.cjs --selectProjects unit-core --runTestsByPath core/tests/unit/core-utils-postgrest.test.ts`
  - `npm test -- --runTestsByPath tests/component/useUpdateNote.test.tsx tests/component/mobileSyncService.test.ts --runInBand` in `ui/mobile`
- Result:
  - All commands above passed.
- Remaining gaps:
  - No dedicated automated web test yet covers the new stale-open guard in `ui/web/hooks/useNoteAppController.ts`.
  - No automated test yet proves the deferred local-write conflict path end-to-end for remote deletion versus unsynced edits (local edits must win).
  - No dedicated automated test yet proves the transient-error fallback path preserves local data without destructive cleanup.
  - No automated test yet covers bulk delete behavior when some selected notes are already deleted on the server.

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
