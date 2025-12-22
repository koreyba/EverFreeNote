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
- [ ] Returns no suggestions below 3 characters.
- [ ] Filters by prefix only.
- [ ] Excludes tags already selected on the note.
- [ ] Sorts alphabetically and limits to 3.

### Tag input UI (new component or `NoteEditor` integration)
- [ ] Adds tag when suggestion clicked.
- [ ] Adds tag via comma and Enter.
- [ ] Does not add tag on space or blur.
- [ ] Normalizes tags to avoid duplicates (trim, collapse spaces, lowercase).
- [ ] Backspace removes last tag only when input is empty.
- [ ] Edit mode uses the same chip UI as read mode and the remove icon removes the tag.

## Integration Tests
**How do we test component interactions?**

- [ ] Edit note: type 3+ chars, see suggestions, select one, tag appears as chip.
- [ ] Edit note: remove tag via X and via backspace, autosave payload updates tags.
- [ ] Read mode: tags display with removal behavior unchanged.

## End-to-End Tests
**What user flows need validation?**

- [ ] Edit note: add a tag via suggestion, save, reload, tag persists.
- [ ] Edit note: remove a tag via backspace and save, tag removed on reload.
- [ ] Read mode: tags are visible and still removable (no regression).
- [ ] Regression: tag filtering via clicking a tag still works.

## Test Data
**What data do we use for testing?**

- Notes fixture with overlapping tags and varying recency.
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

## Performance Testing
**How do we validate performance?**

- Basic sanity: ensure no noticeable lag when typing with many tags.

## Bug Tracking
**How do we manage issues?**

- Track regressions related to tag parsing, autosave, and note updates.

