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
- `core/tests/services/tag-management-notes.test.ts` covers complete-note rename/delete semantics and merge behavior.
- `core/tests/unit/tag-mutation-queue.test.ts` covers preservation and pending reset for bulk queue items.

## Component and Hook Tests

- `ui/mobile/tests/component/useTagManagement.test.tsx` covers online full-note loading/caching and offline SQLite fallback.
- `ui/mobile/tests/component/useTagManagementMutations.test.tsx` covers optimistic local persistence and offline queue creation.
- `ui/mobile/tests/component/alphabeticalIndex.test.tsx` proves clicking another letter selects it rather than toggling the prior letter off.
- `ui/mobile/tests/component/tagSearchInput.test.tsx` covers conditional clear-X rendering and clearing.
- `ui/mobile/tests/integration/tagsScreen.test.tsx` covers the native screen, search/clear, letter filtering, tag navigation, actions, and rename modal.
- `ui/mobile/tests/unit/syncService.test.ts` covers rename/delete queue replay and malformed payload rejection.

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

- Focused feature run: 30/30 passed through Allure Agent, including the native Tags screen, offline mutation, sync replay, and collapsible controller.
- Core run: 3/3 passed through Allure Agent (`tag-management-notes` and `tag-mutation-queue`).
- Sync replay run: 17/17 passed through Allure Agent.
- Existing-screen regression after adding the controller: 74/74 passed through Allure Agent across Notes, Search, Settings, AI Index, and bulk selection.
- Full mobile regression: 700/700 passed through Allure Agent with complete runtime modeling and zero findings.
- Focused mobile coverage run: 30/30 passed. New-file coverage included 100% lines for `ui/mobile/services/sync.ts`, 93.33% lines for `ui/mobile/utils/tagManagement.ts`, 92.3% lines for `ui/mobile/utils/collapsibleTabBar.ts`, 100% lines for `TagManagementCard`/`TagSearchInput`, 55.95% lines for `tags.tsx`, and 72.58% lines for `useTagManagementMutations.ts`. The overall percentage is intentionally low because the command collects all mobile sources while selecting only feature tests.
- Manual Android/iOS smoke testing is not available in this environment; safe-area, modal/keyboard, dark-mode, and animated-bar behavior remain a device QA gate.
