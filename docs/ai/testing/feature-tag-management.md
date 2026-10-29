---
phase: testing
title: Tag Management Testing Strategy
description: Test cases and verification steps for core tag services and web UI components.
---

# Testing Strategy

### Paginated and offline guard

Check 0, 1, 50, 51, 101, and more than 1000 loaded notes. A fresh count larger
than the loaded collection, duplicate IDs, offline status, an unsynced queue,
or a dirty workspace tab must prevent bulk updates. Loading another page and
rechecking must allow the existing online path when all loaded IDs can be
verified. Partial failures/timeouts must not produce a success message; verify
the actual persisted state after rereading and retain any local drafts. Test
single-note editing independently while offline. Also test a synced cache entry
or open saved tab whose server note was deleted elsewhere, a failed absence
check, and ownerless snapshots with matching and unrelated tags. Verify that a
matching tag blocks before PATCH, while an unrelated snapshot remains unchanged;
recheck an ownerless tag or queued draft changed during the batch. Test browser
Back during both successful and failed batches and unchanged invalidation for
unrelated saves.
This interim check does not prove atomicity or protection against concurrent
writes from other clients.

`npm run test:tags:qa` runs the separate real-browser suite in `cypress/qa/`.
It requires a disposable Supabase stack at `127.0.0.1:58421` (or a URL supplied with `CYPRESS_AUDIT_SUPABASE_URL`) and its local
`CYPRESS_AUDIT_ANON_KEY` and `CYPRESS_AUDIT_SERVICE_KEY`. It creates temporary
users and notes, deletes the users afterwards, and must never target a shared or
remote database. Some local CLI setups lack table grants; when required, grant
the authenticated and service roles access to `public.notes` only in that
disposable database. The regular component suite does not require this stack.

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
