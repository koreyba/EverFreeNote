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

