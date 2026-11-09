---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Unit Tests**: Update `NoteList` tests to verify it renders the virtual list. Note that testing virtual lists in JSDOM can be tricky because `AutoSizer` usually renders 0x0. We might need to mock `AutoSizer` or `react-window`.
- **Integration Tests**: Verify that scrolling triggers `onLoadMore`.

## Unit Tests
**What individual components need testing?**

### NoteList
- [ ] Test case 1: Renders without crashing.
- [ ] Test case 2: Displays the correct number of visible items (mocking height).
- [ ] Test case 3: Triggers `onLoadMore` when `onItemsRendered` simulates scrolling to the end.
- [ ] Test case 4: Selection mode checkboxes are visible and clickable.

## Integration Tests
**How do we test component interactions?**

- [ ] Scroll down the list and verify new notes are fetched.
- [ ] Select a note in the virtual list and verify it becomes active in the editor.

## End-to-End Tests
**What user flows need validation?**

- [ ] User loads app with many notes -> List renders instantly.
- [ ] User scrolls rapidly -> No blank screens (or minimal).

## Test Data
**What data do we use for testing?**

- Use the existing `generate-test-notes` script to create a large dataset (e.g., 1000 notes) for manual performance verification.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Run `npm run test:component` to ensure no regressions.

## Initial loading regression (2026-11-09)

`cypress/component/features/notes/NoteListInitialLoading.cy.tsx` seeds one synced note in IndexedDB and holds the first server response containing three notes. The real application controller and shell run throughout the test.

- [x] Desktop list: skeletons remain visible until the first page arrives, then all three cards appear.
- [x] Mobile grid: skeletons remain visible until the first page arrives, then all three cards appear.
- [x] Losing connectivity during the initial request makes the cached note visible and openable.
- [x] A failed initial request falls back to the cached note.
- [x] A background refresh preserves all already loaded cards.

Validation on 2026-11-09:
- Before the fix and after temporarily removing it: the two initial-loading tests fail because the cached card is visible; the three fallback/refresh tests pass (exit 2).
- After restoring the fix: 8/8 browser tests pass, including the five new scenarios and the three existing `MobileNotesGrid.cy.tsx` interaction tests. Allure reports no findings or skipped tests (exit 0).
- Command: `npx allure agent --goal "Validate desktop list and mobile grid startup plus existing grid interactions" --expect-tests 8 --report auto -- npx cypress run --component --browser electron --spec cypress/component/features/notes/NoteListInitialLoading.cy.tsx,cypress/component/features/mobile/MobileNotesGrid.cy.tsx`.
- `npm run type-check`, `npx eslint . --max-warnings=0`, and `git diff --check` pass (exit 0).
- Desktop and mobile screenshots were visually checked before and after the first response.

Coverage is scoped to these loading transitions and adjacent grid interactions; line coverage was not measured. This fixture does not measure production network latency or verify a deployed build.

