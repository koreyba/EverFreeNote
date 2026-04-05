---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: New requirements and design for autosave session reconciliation are documented
- [x] Milestone 2: Shared core reconcile/baseline logic is implemented
- [x] Milestone 3: Mobile regression coverage and final verification are complete

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Shared Core
- [x] Task 1.1: Add a shared field-level same-note reconcile helper in `core/utils/noteAutosaveSession.ts`
- [x] Task 1.2: Extend the debounced autosave utility with baseline rebasing semantics

### Phase 2: Client Integration
- [x] Task 2.1: Update the mobile note editor to reconcile `title`, `description`, and `tags` per field
- [x] Task 2.2: Reuse the shared autosave session/reconcile logic in the web editor flow as well, with behavior symmetric to mobile for clean/dirty same-note refreshes

### Phase 3: Validation & Docs
- [x] Task 3.1: Add unit tests for shared reconcile and debouncer rebase behavior
- [x] Task 3.2: Add mobile regression/integration tests for stale refresh, clean external adoption, and mixed-field behavior
- [x] Task 3.3: Update implementation/testing docs and perform final design-vs-code review

## Dependencies
**What needs to happen in what order?**

- Shared core helpers must be finalized before mobile integration, otherwise UI code will hard-code policy again.
- Mobile integration depends on knowing how `EditorWebView` accepts description updates without forcing a remount.
- Tests should be added after the shared API stabilizes but before final review.

## Timeline & Estimates
**When will things be done?**

- Docs and design validation: 0.5d
- Shared core + mobile integration: 0.5-1d
- Regression tests and final review: 0.5d

## Risks & Mitigation
**What could go wrong?**

- Reintroducing a stale overwrite through debouncer resets
  - mitigate by adding an explicit `rebase` API and unit tests
- Accidentally leaving clean fields stale while protecting dirty fields
  - mitigate with field-by-field reconcile tests and mixed-field integration coverage
- Body editor drift because `description` uses `EditorWebView`
  - mitigate by using the imperative `setContent` bridge rather than remounting the editor

## Resources Needed
**What do we need to succeed?**

- Existing mobile integration test harness
- Core unit test suite
- Current autosave implementation docs for reference

## Constraints & Notes

- This fix is scoped to client-side autosave session correctness; it does not add user-facing merge UI or backend conflict resolution changes.

## Progress Summary

Implementation completed with symmetric same-note refresh reconciliation across mobile and web. Shared core now owns per-field draft/baseline reconciliation and debouncer rebasing, while each client applies the resulting decisions through its own editor bindings. Verification passed for targeted core unit tests, new web unit tests, mobile integration coverage, and type-checking in both the root workspace and `ui/mobile`.
