---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Public Note Links Testing Strategy

## Test Coverage Goals

- Target 100% coverage for new core service branches.
- Cover the critical owner flow: open menu, choose Share note, generate/reuse link, copy or manually select URL.
- Cover the mobile owner flow: open note options, choose Share note, generate/reuse link, and invoke the native share action.
- Cover the public viewer constraints: title/content/tags visible, tags non-clickable, no editing/list/search controls.
- Cover the public viewer theme control: the theme toggle is available in a sticky public header without introducing private note actions.

## Unit Tests

### Core PublicNoteShareService

- [x] Creates a view link when none exists.
- [x] Reuses an existing active view link for the same note/user.
- [x] Builds a public URL from an injected origin and token.
- [x] Fetches public note data by token through the narrow RPC.
- [x] Returns `null` for inactive/missing links.
- [x] Surfaces Supabase errors with actionable messages.

### Public Page Utilities

- [x] Sanitizes note content before rendering.
- [x] Renders tags as plain labels rather than interactive controls.
- [x] Renders a sticky public theme toggle while still hiding private edit/delete/search controls.

### Mobile Share UI

- [x] Renders "Share note" in mobile note options.
- [x] Generates/reuses a public view link through `PublicNoteShareService`.
- [x] Builds the URL from mobile public web origin config.
- [x] Invokes the native share sheet when a generated URL is available.

## Integration Tests

- [ ] Supabase migration applies cleanly in a live Supabase database.
- [ ] Owner cannot create a link for another user's note through RLS.
- [ ] Public RPC returns only one note projection for a valid active token.
- [ ] Public RPC returns no row for inactive or unknown tokens.

## End-to-End Tests

- [ ] Owner opens a note, opens the three-dot menu, selects "Share note", and sees a generated URL in browser/manual E2E.
- [x] Mobile owner opens a note, opens note options, selects "Share note", and sees the mobile share dialog in integration coverage.
- [x] Public recipient opens `/share/?token=...` and sees title, content, and tags in unit coverage.
- [x] Public recipient can access the public theme toggle in unit coverage.
- [x] Public recipient does not see note list, search, edit, delete, AI index, or export controls in unit coverage.

## Test Data

- One authenticated owner with at least one note containing title, rich text description, and tags.
- One unrelated user with a different note to verify isolation.
- One inactive share link for negative lookup.

## Test Reporting & Coverage

- Commands:
  - `npm run type-check`
  - `npm run type-check:tests`
  - `npm run test:unit:core -- --runTestsByPath core/tests/unit/core-services-publicNoteShare.test.ts`
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/publicNotePage.test.tsx`
  - `npm run test:unit:web`
  - `npm --prefix ui/mobile test -- --runTestsByPath tests/component/shareNoteDialog.test.tsx tests/integration/noteEditorScreen.test.tsx`
  - `npm --prefix ui/mobile run type-check`
  - `npm --prefix ui/mobile run lint`
  - `npm run eslint`
- Implemented tests:
  - `core/tests/unit/core-services-publicNoteShare.test.ts`
  - `ui/web/tests/unit/components/shareNoteDialog.test.tsx`
  - `ui/web/tests/unit/components/publicNotePage.test.tsx`
  - `ui/mobile/tests/component/shareNoteDialog.test.tsx`
  - `ui/mobile/tests/integration/noteEditorScreen.test.tsx`
- Results:
  - `npm run type-check` passed.
  - `npm run type-check:tests` passed.
  - `npm --prefix ui/mobile test -- --runTestsByPath tests/component/shareNoteDialog.test.tsx tests/integration/noteEditorScreen.test.tsx` passed: 2 suites, 36 tests. Jest reported its existing force-exit worker warning after successful completion.
  - `npm --prefix ui/mobile run type-check` passed.
  - `npm --prefix ui/mobile run lint` passed with `--max-warnings=0`.
  - `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/publicNotePage.test.tsx` passed after adding the public theme toggle coverage.
  - `npm run test:unit` passed: 43 suites, 393 tests.
  - `npm run test:unit:core -- --runTestsByPath core/tests/unit/core-services-publicNoteShare.test.ts --coverage --collectCoverageFrom core/services/publicNoteShare.ts` passed with 100% statements/branches/functions/lines for `publicNoteShare.ts`.
  - `npm run eslint` passed with `--max-warnings=0`.
  - `npm run deno-check` passed.
  - `npm run build` passed after revising the public route to static-export-compatible `/share/?token=...`.
- Remaining gaps:
  - Live Supabase migration/RLS/RPC behavior still needs verification against a real linked/local database.
  - Full repository coverage remains below 100% because of pre-existing uncovered modules; new core service coverage is 100%.

## Manual Testing

- Verify dialog focus, escape/close behavior, loading state, and copy feedback.
- Verify public route in a logged-out/incognito browser state.
- Verify responsive layout on desktop and narrow viewport.
- Local smoke checked `http://localhost:3000/share/?token=missing-smoke-token`: route loads outside `NotesShell` and shows the public-message layout. Supabase fetch failed because the local Supabase REST endpoint was not running, so live valid-token rendering still needs DB-backed verification.

## Performance Testing

- Confirm public route performs a single bounded token lookup.
- Confirm share dialog does not load links for every note in the list.

## Bug Tracking

- Treat any public data leakage, editable public controls, or cross-note access as blocking severity.
