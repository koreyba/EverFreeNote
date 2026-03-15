---
phase: planning
title: Project Planning & Task Breakdown - Mobile Search Remote Delete Consistency
description: Break down the work needed to reconcile remote deletions on mobile without breaking offline fallback
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Confirm requirements, design, and reconciliation policy for remote deletions
- [ ] Milestone 2: Implement typed remote lookup outcomes and mobile reconciliation flows
- [ ] Milestone 3: Validate search, note opening, offline fallback, and conflict scenarios with tests

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Audit current mobile note-open, search, cache, SQLite, and sync behavior for remote deletion gaps
- [ ] Task 1.2: Introduce a core-level semantic distinction between `found`, `not_found`, and `transient_error` for note reads
- [ ] Task 1.3: Document how existing conflict handling should apply when local edits race with remote deletion

### Phase 2: Core Features
- [ ] Task 2.1: Update mobile note-opening logic to allow local fallback only for offline or transient failures
- [ ] Task 2.2: Reconcile remotely deleted notes out of React Query note/search/list caches
- [ ] Task 2.3: Reconcile remotely deleted notes out of mobile SQLite so local search/list fallback stops resurfacing ghost notes
- [ ] Task 2.4: Implement the confirmed refresh triggers: manual refresh, full app close and reopen, and repeated search execution
- [ ] Task 2.5: Add clear user-facing deleted-note handling in note detail flow
- [ ] Task 2.6: Mirror the same refreshed-data and stale-open behavior across web and mobile

### Phase 3: Integration & Polish
- [ ] Task 3.1: Verify deferred local writes still sync after temporary failures
- [ ] Task 3.2: Add tests for remote deletion, transient failure fallback, stale search cleanup, and conflict-sensitive cases
- [ ] Task 3.3: Update implementation/testing docs with actual behavior, coverage, and any remaining gaps

## Dependencies
**What needs to happen in what order?**

- Requirements and design must be approved before code changes start.
- Core outcome classification should land before mobile hook behavior changes.
- Mobile reconciliation depends on understanding current cache keys and SQLite deletion semantics.
- Conflict-sensitive behavior depends on the current offline queue policy and any existing last-write-wins assumptions already used by the project.
- Test updates depend on the final reconciliation triggers and user-facing deleted-note UX.

## Timeline & Estimates
**When will things be done?**

- Phase 1: Small, 0.5-1 day
- Phase 2: Medium, 1-2 days
- Phase 3: Medium, 1 day
- Overall estimate: 2.5-4 days depending on how much conflict handling refinement is required
- Buffer:
  - Additional time may be needed if existing sync/conflict behavior is less explicit in code than in documentation

## Risks & Mitigation
**What could go wrong?**

- Risk: Misclassifying Supabase "not found" could break legitimate offline fallback
  - Mitigation: Add explicit tests for `not_found`, offline, timeout, and generic transient failures
- Risk: Remote-delete cleanup could remove notes that still have unsynced local changes
  - Mitigation: route conflict-sensitive cases through the existing sync/conflict policy and test them explicitly
- Risk: Search screen remains stale longer than some users expect because v1 avoids background reconciliation
  - Mitigation: implement the confirmed explicit refresh triggers and ensure stale open attempts fail safely with clear feedback
- Risk: Partial cleanup leaves React Query and SQLite out of sync
  - Mitigation: centralize note cleanup helpers and test cross-cache plus local-storage effects together

## Resources Needed
**What do we need to succeed?**

- Existing project knowledge about mobile offline sync and conflict handling
- Current mobile test suite for search, note detail, and deletion flows
- Supabase error-shape knowledge for missing-row versus transient failure cases
- Manual validation on mobile flows that switch between web and mobile deletion scenarios
