---
phase: testing
title: Tag Management Testing Strategy
description: Test cases and verification steps for core tag services and web UI components.
---

# Testing Strategy

## Test Coverage Goals
- 100% unit test coverage for `core/services/tags.ts`.
- Component unit tests for `TagsPage`, `AlphabeticalGrid`, `TagCard`, `RenameTagDialog`, and `DeleteTagDialog`.

## Unit Test Cases (`core/tests/tags.test.ts`)
- [ ] Aggregation: correctly computes count of notes containing each tag.
- [ ] Sorting: sorts tags alphabetically case-insensitively.
- [ ] Grouping: groups tags under initial character (A-Z, # for non-alpha).
- [ ] Renaming: renames specified tag in notes array without mutating original array; skips notes without the tag.
- [ ] Deleting: removes target tag from notes array cleanly.

## UI Test Cases (`ui/web/tests/`)
- [ ] Render tags with count badges `(N)`.
- [ ] Clicking tag triggers filter callback.
- [ ] Opening context menu shows Rename and Delete options.
- [ ] Submitting rename dialog updates notes.
- [ ] Submitting delete dialog removes tag.
- [ ] Clicking alphabetical letter scrolls or filters tag section.
