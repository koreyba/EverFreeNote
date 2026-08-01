---
phase: testing
title: Tag Management Testing Strategy
description: Test cases and verification steps for core tag services and web UI components.
---

# Testing Strategy

## Test Coverage Goals
- 100% unit test coverage for `core/services/tags.ts`.
- Component unit tests for `TagsPage`, `AlphabeticalGrid`, `TagCard`, `RenameTagDialog`, and `DeleteTagDialog`.

## Unit Test Cases (`core/tests/unit/tags.test.ts`)
- [x] Aggregation: correctly computes count of notes containing each tag.
- [x] Sorting: sorts tags alphabetically case-insensitively.
- [x] Grouping: groups tags under initial character (A-Z, # for non-alpha).
- [x] Renaming: renames specified tag in notes array without mutating original array; skips notes without the tag.
- [x] Deleting: removes target tag from notes array cleanly.
- [x] Cleanup: removes invalid, empty, whitespace-only, and case-insensitive duplicate tags while preserving unchanged note references.

## UI Test Cases (`ui/web/tests/`)
- [x] Render tags with count badges `(N)`.
- [x] Clicking tag triggers filter callback.
- [x] Opening context menu and confirming rename warns before merging an existing tag.
- [x] Submitting delete dialog invokes the delete callback.
- [x] Clicking alphabetical letters filters the displayed tag section, including switching from one letter to another.
- [x] Empty notes show the empty state.
