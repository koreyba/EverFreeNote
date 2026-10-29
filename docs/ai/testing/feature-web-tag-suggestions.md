---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% of new/changed code.
- Integration tests: editor tag flow (add/remove/suggest) + read mode removal remains available.
- End-to-end: edit note, add tag via suggestion, save, read mode shows tags with removal unchanged.
- Align coverage with all success criteria in requirements.

## Unit Tests
**What individual components need testing?**

### Tag suggestion hook (`useTagSuggestions`)
- [x] Returns no suggestions below 3 characters. (Covered in `ui/web/tests/unit/hooks/useTagSuggestions.test.ts`)
- [x] Filters by case-insensitive prefix matching. (Covered in `ui/web/tests/unit/hooks/useTagSuggestions.test.ts`)
- [x] Excludes tags already selected on the note. (Covered in `ui/web/tests/unit/hooks/useTagSuggestions.test.ts`)
- [x] Sorts alphabetically and limits to 3 items. (Covered in `ui/web/tests/unit/hooks/useTagSuggestions.test.ts`)

### Tag input UI (`TagInput` & `NoteEditor` integration)
- [x] Adds tag when suggestion clicked. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Supports keyboard ArrowDown/ArrowUp and Enter/Tab suggestion selection. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Adds tag via comma and Enter. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Normalizes tags to avoid duplicates (trim, collapse spaces, lowercase). (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Backspace removes last tag only on the second press when input is empty. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Edit mode uses chip UI and X remove control works. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Tag input changes alone do NOT trigger autosave directly and persist on manual save, note switch, or title/body edits. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)
- [x] Pending tag is committed on blur / save. (Covered in `cypress/component/features/notes/NoteEditor.cy.tsx`)

## Integration Tests
**How do we test component interactions?**

- [ ] Edit note: type 3+ chars, see suggestions, select one, tag appears as chip.
- [ ] Edit note: remove tag via X and via backspace; tag-only changes do not trigger autosave directly and persist on manual save, note switch, or title/body edits.
- [ ] Read mode: tags display with removal behavior unchanged.

## End-to-End Tests
**What user flows need validation?**

- [ ] Edit note: add a tag via suggestion, save, reload, tag persists.
- [ ] Edit note: remove a tag via backspace and save, tag removed on reload.
- [ ] Read mode: tags are visible and still removable (no regression).
- [ ] Regression: tag filtering via clicking a tag still works.

## Test Data
**What data do we use for testing?**

- Notes fixture with overlapping tags and alphabetical ordering.
- Ensure at least 4 candidate tags to validate the limit of 3.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Coverage command: `npm run test -- --coverage`.
- Record any coverage gaps and rationale in this doc.
- Manual testing outcomes and sign-off go in Manual Testing section.

## Manual Testing
**What requires human validation?**

- Check suggestion dropdown placement and keyboard usability.
- Verify read mode removal still works as before.
- Confirm tag chips wrap correctly with long tag names.
- Confirm remove icons are always visible on mobile viewports.

## Performance Testing
**How do we validate performance?**

- Basic sanity: ensure no noticeable lag when typing with many tags.

## Bug Tracking
**How do we manage issues?**

- Track regressions related to tag parsing, autosave, and note updates.


## Inline entry validation (2026-10-29)

- 45/45 Cypress component tests passed through Allure agent: `TagEntryBehavior`,
  `NoteTagLayout`, `NoteEditor`; expected count matched, no findings or retries.
- New geometry assertions cover 320/1280 px: input and Add share the same top,
  input stays before Add, body position is unchanged on open/confirm. Expanded
  long-tag cancellation retains the original document position and disclosure.
- Existing coverage verifies first click/touch, second Add, comma, Enter,
  autocomplete, double Backspace, prepend order, save payloads and responsive tags.
- Existing tests now check chips are hidden during input and restore before
  disclosure/removal. `NoteEditor` tests import real CSS for visibility checks.
- Full fast type checks (root/core/core tests/web tests/shell tests/shell) and
  repository ESLint passed. No dependency or lockfile edits.
- Runtime used existing macOS dependencies via local symlinks, not a fresh locked
  install. Native device/virtual keyboard and real backend reload acceptance are
  outside component scope; independent synthetic browser QA is tracked separately.
- The expanded collection deliberately retains its space while entry is open.
  Adding/removing tags can naturally change collection height; opening/cancelling
  alone does not. No animation was added, so no motion preference override is needed.
