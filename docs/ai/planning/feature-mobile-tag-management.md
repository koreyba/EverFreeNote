---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Mobile Tag Management Plan

## Scope

This plan covers one feature and one PR: the native mobile Tag Management page, its dedicated bottom tab, offline-capable mutations, and the collapsible bottom tab bar behavior. The collapsible navigation is not a follow-up feature.

## Milestones

### 1. Foundation and data contract

- Confirm the online affected-note query/operation needed for complete rename/delete behavior.
- Decide whether per-note queue entries are sufficient or add an idempotent bulk tag queue operation.
- Extract or reuse shared pure tag normalization, grouping, rename, delete, and deduplication logic.
- Define query keys, optimistic state, rollback, invalidation, and sync reconciliation.

### 2. Navigation and collapsible tab bar

- Add the `Tags` sibling route to the main Expo Router tabs.
- Implement the shared collapsible tab-bar controller with initial visible state.
- Wire scroll direction/offset events from the scrollable main screens.
- Preserve safe-area insets and reset visibility on tab focus.

### 3. Native Tag Management UI

- Build the screen header/total, loading/error/empty states, search input, and clear X.
- Add the alphabetical index with assignment semantics for every clicked letter.
- Add grouped native tag cards with note counts and accessible action controls.
- Route tag selection to the existing Search screen.
- Add native rename modal and delete confirmation.

### 4. Mutations and offline behavior

- Implement rename and delete with web-compatible case/whitespace/deduplication semantics.
- Apply optimistic local changes and queue offline work safely.
- Handle retry, failed sync, partial/incomplete cache, and post-sync reconciliation.
- Invalidate or update tag, note, and search queries after successful operations.

### 5. Tests and validation

- Add unit tests for shared tag domain operations and grouping.
- Add component/hook tests for search, clear, alphabetical selection, cards, dialogs, loading/error/empty states, and navigation intent.
- Add offline/sync integration tests for rename/delete completeness and idempotent replay.
- Add controller tests for initial visible, hide-on-down, show-on-up, top reset, and focus reset behavior.
- Run mobile type-check, lint, focused tests, and the relevant full validation commands.
- Perform Android/iOS manual smoke testing for safe areas, keyboard/modal behavior, dark mode, and scroll animation.

## Task Breakdown and Dependencies

| ID | Task | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- |
| T1 | Add complete-note service contract and typed bulk queue operations | None | 0.5–1 day | done |
| T2 | Reuse shared pure tag operations and expose mobile management query derivation | T1 | 0.25–0.5 day | done |
| T3 | Implement online/offline mutation orchestration, sync replay, and invalidation | T1, T2 | 0.5–1 day | done |
| T4 | Add Tags route and shared collapsible tab-bar controller | None | 0.5–1 day | done |
| T5 | Build native Tags screen, search, index, grouping, and cards | T2, T4 | 0.75–1.5 days | done |
| T6 | Build rename/delete interactions and accessibility states | T3, T5 | 0.5–1 day | done |
| T7 | Add focused component, hook, sync, and navigation tests | T2–T6 | 0.75–1.5 days | done |
| T8 | Run validation and mobile manual QA; update implementation/testing docs | T7 | 0.5–1 day | done |

## Execution Queue

- [x] T1 — complete-note service contract and typed bulk queue operations
- [x] T2 — shared tag operations and mobile management query derivation
- [x] T3 — online/offline mutation orchestration and sync replay
- [x] T4 — Tags route and collapsible tab-bar controller
- [x] T5 — native Tags screen and list interactions
- [x] T6 — rename/delete dialogs and accessibility states
- [x] T7 — focused behavioral tests
- [x] T8 — validation, manual QA, and documentation evidence

## Execution Update

T1 is complete. The core service can load the complete user note set and apply idempotent case-insensitive tag rename/delete operations, while the queue model now accepts typed bulk tag mutations and preserves them during compaction. No database migration is required for the current queue schema because the existing non-null `noteId` column will store a stable synthetic bulk-operation key.

T2 is complete. Mobile now derives canonical summaries, groups, letters, and search filtering from the shared core tag functions and has a user-scoped full-note query with SQLite fallback. The mobile type-check reached the existing project-wide `lucide-react-native` declaration failure; no errors were reported for the new T2 files.

T3 and T4 are complete. Rename/delete now update cached notes optimistically, fall back to typed bulk queue items when offline or remote calls fail, replay through the complete-note service, invalidate note/tag/search caches, and preserve queue ordering. Queue compaction now removes superseded/no-op rows and rejects malformed rename payloads instead of replaying stale or incomplete operations. The shared collapsible controller starts visible, accumulates 16 px of scroll direction before changing state, resets at the top and on pathname/tab changes, and is wired to Notes, Search, Settings, and the new Tags route slot. The current tab-bar presentation uses a native transform/opacity style; platform animation timing remains a QA item.

T5 and T6 are complete. The native Tags screen now has total count, case-insensitive search, a clear X, explicit alphabetical selection, grouped cards, filtered-note navigation, accessible action controls, a native action modal, rename modal with merge confirmation, and destructive delete confirmation. The UI uses existing mobile theme/input/button primitives and the shared query/mutation hooks.

T7 is complete. Unit, component, integration, core service, queue, hook, and sync replay tests now cover the feature contract, including the regression where selecting a second letter must select that letter. Existing screen mocks were updated to provide the new scroll controller dependency, and the affected Notes/Search/Settings/AI Index/bulk-selection regression suites pass.

T8 is complete. Core/mobile type-check, mobile lint, root ESLint, ai-devkit phase lint, diff hygiene, focused Allure runs, core runs, sync replay, existing-screen regression, focused coverage, and the full 706-test mobile regression have passed. Android/iOS device smoke testing is unavailable in the current environment and remains the explicit handoff QA gap.

The remaining gate is final validation and review. The main residual risk is device-specific tab-bar animation/modal/safe-area behavior, which cannot be exercised without Android/iOS devices here.

The estimates are rough planning guidance, not a commitment. T1 is the main design gate: implementation must not proceed with a partial bulk-update assumption.

## Verification Matrix

| Area | Evidence |
| --- | --- |
| Navigation | Route test and manual opening of Tags from every main tab |
| Tag display | Query/domain tests for counts, casing, grouping, search, and clear |
| Alphabetical index | Test that clicking A then another letter selects the second letter |
| Rename/delete | Domain + service tests covering case-insensitive matching, trim, merge, and delete |
| Offline | Local persistence, queue/replay, retry, and incomplete-cache behavior tests |
| Collapsible navigation | State-transition tests plus manual down/up/top/focus checks |
| Accessibility | Labels/roles and manual touch-target/modal/keyboard checks |
| Quality | `npm --prefix ui/mobile run type-check`, `npm --prefix ui/mobile run lint`, focused Jest/Allure evidence |

## Risk Management

- Stop and revisit the data contract if the service cannot identify the complete affected set.
- Treat incomplete local cache as an explicit state, not as successful full mutation.
- Keep the tab-bar controller independent of animation so direction behavior is deterministic in tests.
- Keep the PR focused on mobile Tag Management and the navigation behavior required by it; do not mix unrelated refactors.
