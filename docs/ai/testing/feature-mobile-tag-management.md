---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Mobile Tag Management Testing Strategy

The strategy below is implemented by the feature tests and the existing mobile regression suites.

## Test Objectives

Verify that mobile Tag Management is behaviorally aligned with the web rules, remains correct across online/offline states, and adds a stable collapsible bottom navigation without regressions in existing tabs.

## Unit Tests

- `ui/mobile/tests/unit/tagManagement.test.ts` covers canonical casing/counts, search, letter filtering, and grouping.
- `ui/mobile/tests/unit/collapsibleTabBar.test.ts` covers initial visible, downward hide threshold, upward reveal, direction reversal, and top reset.
- `core/tests/services/tag-management-notes.test.ts` covers complete-note rename/delete semantics, merge behavior, and shared persistence of changed notes.
- `core/tests/unit/tag-mutation-queue.test.ts` covers preservation and pending reset for bulk queue items.
- `core/tests/unit/offline-sync-manager.test.ts` covers removing superseded queue rows after compaction so failed bulk operations are not replayed.

## Component and Hook Tests

- `ui/mobile/tests/component/useTagManagement.test.tsx` covers online full-note loading, empty-snapshot reconciliation, and offline SQLite fallback.
- `ui/mobile/tests/component/useTagManagementMutations.test.tsx` covers optimistic local persistence, retryable offline queue creation, and propagation of permanent online failures.
- `ui/mobile/tests/unit/databaseService.test.ts` covers replacing a user snapshot while preserving unsynced local notes.
- `ui/mobile/tests/component/alphabeticalIndex.test.tsx` proves clicking another letter selects it rather than toggling the prior letter off.
- `ui/mobile/tests/component/tagSearchInput.test.tsx` covers conditional clear-X rendering and clearing.
- `ui/mobile/tests/integration/tagsScreen.test.tsx` covers the native screen, search/clear, letter filtering, tag navigation, actions, and rename modal.
- `ui/mobile/tests/unit/syncService.test.ts` covers rename/delete queue replay and malformed payload rejection, including a missing rename replacement.

## Integration Tests

- Core service tests and mobile sync tests verify complete online operations and idempotent replay boundaries.
- The mutation hook test verifies local SQLite state is updated before an offline bulk queue item is created.
- Full cache completeness is established by the online `getAllNotes` service contract; local fallback remains explicitly marked.
- Existing Search/Notes/Settings/AI Index regression suites remain part of the full mobile run.

## Regression and Manual QA

- Existing mobile tag chip, tag filter, note editor, Notes, Search, and Settings tests remain green.
- Android and iOS smoke checks cover opening Tags from each tab, dark mode, safe areas, keyboard/modal layout, long lists, and rotation where supported.
- Scroll down hides the bottom bar, scroll up reveals it, opening a tab shows it, and the last content row remains reachable.
- TalkBack/VoiceOver can identify the Tags tab, clear search, alphabet letters, tag actions, and destructive confirmation.

## Quality Gates

Run focused tests with the project's Allure agent workflow when modifying or adding tests, then run the regular mobile commands:

```text
npx allure agent --goal "Verify mobile Tag Management behavior" -- npm --prefix ui/mobile test -- --runInBand
npm --prefix ui/mobile run type-check
npm --prefix ui/mobile run lint
```

Use coverage as supporting evidence, not as a replacement for the behavioral assertions above.

## Phase 7 Evidence

- Focused feature regression: 23/23 passed through Jest across the Tags screen, data/mutation hooks, provider, and collapsible controller.
- Full mobile regression with coverage: 82 suites and 706 tests passed; changed-file line coverage includes 92.3% for `tags.tsx`, 100% for `useTagManagement.ts`, `useTagManagementMutations.ts`, and `CollapsibleTabBarProvider.tsx`, and 100% for `ui/mobile/utils/collapsibleTabBar.ts`.
- Root unit/integration/web coverage: 183 suites and 1,418 tests passed; changed `core/services/notes.ts` lines are covered and the tag queue tests pass.
- The fresh local union of executable changed lines is 92.8% (258/278), above the Sonar new-code threshold; the external Sonar result must still be rechecked after the fix is pushed.
- `npx ai-devkit@latest lint --feature mobile-tag-management`, root type-check, mobile type-check, mobile lint, and core test type-check pass.
- Manual Android/iOS smoke testing is not available in this environment; safe-area, modal/keyboard, dark-mode, and animated-bar behavior remain a device QA gate.
