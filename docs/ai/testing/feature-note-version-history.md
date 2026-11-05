---
phase: testing
title: Note version history validation
description: Evidence for the local version history preview
---

# Note version history validation

## Database and API

- [x] All 21 pgTAP checks passed in disposable PostgreSQL with the Trash and version migrations applied. They cover snapshot creation, access, restore conflicts, Trash recovery without duplicate versions, and permanent purge of history and historical image references.
- [x] The Trash PostgreSQL integration suite loads the version migration and verifies that recovery preserves versions and that an image referenced by another note's history survives cleanup. The 23 default cases passed.
- [x] The authenticated REST API returned 200 for a valid restore, 409 for a stale restore, and 404 for a note owned by another account.

## Web

- [x] The history menu test opens an earlier version, renders its formatted text and tags, and restores it with the latest revision as a precondition.
- [x] Restore tests cover unsynced edits, stale restores, refreshing the latest version, and updating search and the local cache without overwriting a newer draft.
- [x] Two Cypress checks exercise the actual IndexedDB transaction, including overlapping writes and preserving queued changes.
- [x] In the local browser, restoring version 1 from version 3 produced version 4. The restored note and all four versions were visible after a reload.
- [x] `npm run type-check` and `eslint . --max-warnings=0` passed.

## Version comparison

- [x] Unit tests cover comparison direction, Unicode word boundaries with and without `Intl.Segmenter`, multiline replacements, tag changes, identical content, and large input limits.
- [x] The dialog tests cover both selectors, reversing a pair, switching views, paging through 64 versions, and keyboard selection and focus return.
- [x] The local browser showed v1 to v3 and v3 to v1. Switching views preserved both choices. Back to history returned to the original v2 preview.
- [x] A 64-version demo note was checked in a mobile browser viewport (390 × 844 and 667 × 375). The history and selectors scroll, both comparison views showed v1 to v32, and the landscape preview leaves room for the restore button. Comparison was also checked in light and dark themes.
- [x] The full core and web unit suites passed.

## Coverage boundary

The demo exercises synced snapshots on web. Grouping edit sessions, retaining individual offline saves, and resolving edits queued on another device are outside the local preview scope.
