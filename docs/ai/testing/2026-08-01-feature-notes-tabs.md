---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals

- 100% branch coverage for new pure workspace transitions and hydration guards.
- Component/controller coverage for every open-note source, tab lifecycle, persistence, and save-error path.
- Regression coverage for autosave flush/reconciliation, Reading/Editing restoration, Tags/Search/Settings navigation, and mobile presentation.
- Use Allure agent mode for focused runs and inspect report-backed evidence rather than relying on test counts alone.

## Unit Tests

### `core/services/noteWorkspaceTabs.ts`

- [x] Creates one blank active tab.
- [x] Adds and activates one new blank tab.
- [x] Opens a note in the active tab without increasing tab count.
- [x] Activates an existing tab when the note ID is already open.
- [x] Preserves order and chooses the right/left neighbor on close.
- [x] Replaces the final closed tab with one blank active tab.
- [x] Applies tab patches without breaking invariants.
- [x] Rejects malformed, duplicate, unsupported-version, and oversized snapshots.

### Web storage and hook

- [x] Round-trips valid state through `sessionStorage`.
- [x] Handles blocked storage, invalid JSON, and quota errors without throwing.
- [x] Persists per-browser-tab state without using `localStorage`.

## Integration Tests

- [x] Controller flushes pending autosave and captures the outgoing tab before activation.
- [x] Selecting list/search/tag/internal result replaces the active tab.
- [x] Selecting a duplicate note activates the existing tab and does not create a second session.
- [x] Dirty draft and save-error state remain on the tab after switching.
- [x] Closing a failed tab requires explicit confirmation.
- [x] Editor draft, title selection, scroll, and best-effort ProseMirror selection restore after activation.
- [x] Reading scroll restores after activation.
- [x] Settings return preserves tabs and active tab; Tags/Search view changes do not clear them.
- [x] Mobile Add tab closes the compact menu, keeps the note list available, and lets the next list selection fill the new active slot.
- [x] Desktop Add tab stays before the scrolling tab viewport and disables at the measured minimum-width capacity.
- [x] Core/controller Add guard blocks the shared 32-tab ceiling without flushing, and mobile announces the same disabled state with a scrollable list.

## End-to-End Tests

Playwright E2E lives in the separate `koreyba/EverFreeNote-e2e` repository, which
has no notes-tabs coverage yet. The four scenarios below are a scoped follow-up
in that repository; they are not deliverable from this branch. The mobile items
are covered by in-repo Cypress component tests (`MobileLayout.cy.tsx`), and the
desktop flows were verified manually against the PR preview deployment (see
Recorded Evidence).

- [ ] Open note A, add tab, open note B, switch A/B, and verify both contexts. *(follow-up in EverFreeNote-e2e)*
- [ ] Open note A from normal list, search, tag-only results, and AI/internal flow and verify one tab. *(follow-up in EverFreeNote-e2e)*
- [ ] Reload the same browser tab and verify order, active tab, mode, draft, and scroll. *(follow-up in EverFreeNote-e2e)*
- [ ] Close active tabs in both neighbor directions and close the final tab. *(follow-up in EverFreeNote-e2e)*
- [x] Use the compact mobile tab list to switch and close tabs. *(Cypress component coverage)*
- [x] Create a blank mobile tab, close the menu, and select a note from the visible list. *(Cypress component coverage)*

## Test Data

- Use deterministic `NoteViewModel` fixtures with distinct IDs, long titles, long HTML bodies, tags, and unsaved drafts.
- Mock storage only at the adapter boundary.
- Keep existing Supabase/offline mocks and test real reducer/controller behavior around them.

## Test Reporting & Coverage

- Focused web unit/component run: `npm run test:unit:web` (wrapped by Allure agent mode for evidence).
- Core reducer run: the focused Jest test path for the new core service (wrapped by Allure agent mode).
- Production type-check and lint run independently of test success.
- Record exact commands, pass/fail status, and any environment limitations here after implementation.

## Manual Testing

- Desktop: keyboard tab navigation, ellipsis, horizontal overflow, dirty/error markers, close confirmation, and accessible capacity state with Add fixed on the left.
- Mobile viewport: active-note summary, tab count, compact list/sheet, touch targets, screen-reader labels.
- Reload: verify `sessionStorage` restore and separate browser-tab isolation.
- Network/offline: switch during autosave and after an induced save error.

## Recorded Evidence

- Allure Agent workspace/model/UI run: 34/34 passed, expectations matched, findings 0. Report: `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-58hLNC`.
- Existing controller regression run under Allure Agent: 18/18 passed, findings 0. Report: `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-yHYkoU`.
- `npm run type-check`: passed, including root, core, web tests, and `ui/mobile`.
- Focused ESLint for changed source/test files: passed.
- Full unit coverage run: 184 suites and 1,430 tests passed; changed workspace/controller paths were exercised, including manual-save, autosave, Read error states, and oversized snapshot rejection.
- Targeted Chrome component run: 41/41 logical tests passed across NoteEditor, FTS exit-save, like-search exit-save, and AI open-in-context scenarios. The local Cypress process still returned exit 1 after the passing spec summaries; Allure attributed that to a runner-level webpack-dev-server bootstrap signal, with no assertion failures.
- `npx ai-devkit@latest lint --feature notes-tabs`: passed.
- Native mobile route/store tab adaptation was not included; responsive web mobile controls are covered by component tests.

### Final review pass (2026-08-20)

- `npm run type-check`: passed (root, core, core tests, web tests, `ui/mobile`).
- `npx eslint . --max-warnings=0`: passed.
- `npm run test:unit`: 183 suites, 1,441 tests passed — includes new coverage for `resetWorkspaceTabsForNotes`, `useDebouncedSessionCallback`, flush-failure transition abort, delete-driven tab reset, and `onNotesDeleted` bulk reporting.
- `npm run test:integration:core`: 2 suites, 20 tests passed.
- Focused Cypress component run (`NotesTabStrip`, `MobileLayout`, `NotesShellFtsExitSave`, `NotesShellLikeExitSave`, `NotesShellOpenInContext`, `NotesShellAutoSaveEcho`, `useNoteBulkActionsDirect`): 21/21 passed in Electron.
- Manual verification against the PR preview deployment (test-auth user): desktop tab add/replace/dedupe/switch/close, draft/mode restore across switches, reload restore, mobile compact menu.
- The manual preview pass caught an autosave-killing draft-echo defect that the suites missed (fake controllers used a no-op `handleDraftChange`): typing produced zero Supabase writes and the dirty marker never cleared. Fixed in `NotesShell` (frozen session draft) and regression-guarded by `NotesShellAutoSaveEcho.cy.tsx`, verified to fail without the fix.

### Responsive/browser pass (2026-09-10)

Run against a local Supabase stack and the Next dev server, driven through the
in-app browser at 320, 360, 375, 390, 768, 900, 1024, 1280 and 1440 CSS px,
with workspaces of 1, 2, 8 and 24 tabs (including titles long enough to be
ellipsized, Cyrillic titles, and notes long enough to scroll).

Verified working:

- Open note into the active tab, Add tab, fill the new blank tab from the list,
  close tab, and duplicate-note deduplication (re-selecting an open note
  activates its existing tab instead of adding one).
- Reading and editing scroll positions survive tab switches and a page reload,
  and carry over from reading into editing for the same note. (Note when
  re-testing: the restore runs inside `requestAnimationFrame`, which is
  suspended while the browser pane is hidden — measure with the page visible
  or the restore appears to be lost.)
- Autosave from the tab-aware controller reaches the database; the tab label
  follows the edited title.
- Long titles ellipsize in the desktop tab, the mobile header, and the mobile
  menu rows.
- No horizontal page overflow at any tested width.

Defects found and fixed in this pass:

| Defect | Where | Fix |
|---|---|---|
| Add disabled by measured width: 8 tabs max at 1440px, 4 at 1024px, never the documented 32; the label announced a limit lower than the number of open tabs | `NotesTabStrip` | Add is gated on `MAX_NOTE_WORKSPACE_TABS` only |
| Overflowing tabs unreachable — no arrows, and macOS overlay scrollbars stay invisible until scrolling | `NotesTabStrip` | Chevron controls plus wheel-to-horizontal scrolling |
| Strip grew 43px → 54px when the horizontal scrollbar appeared | `NotesTabStrip` | `.scrollbar-none` on the viewport |
| Active tab scrolled out of view after a window resize, and clipped on load with 24 tabs | `NotesTabStrip` | `ResizeObserver` re-reveals it; `scrollIntoView` targets the whole tab, not just its title button |
| A clipped tab could show only its close button, inviting a click that closes an unreadable tab | `NotesTabStrip` | `snap-x snap-mandatory` with `snap-start` tabs |
| Mobile tab menu sat in flow and pushed the note down 545px | `MobileNotesTabMenu` | Absolutely positioned popover |
| Mobile menu had no outside-click or Escape dismissal | `MobileNotesTabMenu` | Pointer-down and Escape handlers |
| Mobile menu opened at the top of a 24-row list, hiding the active tab | `MobileNotesTabMenu` | Active row scrolled into view on open |
| Close-tab confirmation said "this tab" for an unsaved new note | `useNoteAppController` | Falls back to the live draft title |

Known, not fixed here (pre-existing, outside this feature):

- At 320px the `NoteView`/`NoteEditor` action bar overflows its header by
  ~12px, clipping the "more actions" button. Unchanged by this PR and fine
  from 360px up.

### Account-boundary pass (2026-09-10)

Found by signing in as a second test user in the same browser tab: the tab
strip still listed the first user's notes, and their bodies were readable from
`sessionStorage`. Workspace state had no account stamp and
`clearNoteWorkspaceState()` was never called from app code.

Verified after the fix, against the running app with two seeded users:

- Signing out empties the persisted workspace (one blank tab, `userId: null`,
  no cached note objects).
- Signing in as the second user yields a workspace stamped with *their* id and
  a single blank tab; none of the first user's titles or bodies appear.
- A workspace blob stamped with another account, planted directly into
  `sessionStorage` to simulate a sign-out that never ran, is discarded on the
  next load instead of rendered.

Regression coverage: `core-services-noteWorkspaceTabs.test.ts` (mismatched
stamp, and legacy state with no stamp) and `noteWorkspaceStorage.test.ts`
(shared session key not restored across accounts).

### Storage-budget pass (2026-09-10)

Measured before changing anything: a tab costs ~2x the note body, because the
note and a clean tab's identical draft are both stored. At 60KB bodies only 17
tabs fit the 2MB budget while the UI allows 32 — past that the write threw,
the error was swallowed, and nothing persisted at all.

After the change, per-tab cost is halved and the ceiling clears the cap:

| note body | tabs that fit, before | after |
|---|---|---|
| 10,000 chars | 103 | 204 |
| 30,000 chars | 34 | 69 |
| 60,000 chars | 17 (below the 32 cap) | 34 |

Coverage: core tests assert the redundant draft is omitted while a diverged
draft is kept, that the round trip is unchanged, that an over-budget snapshot
keeps the active and unsaved tabs and sheds saved ones, and that it reports
failure only when the active tab alone will not fit. A hook test asserts the
warning fires once rather than on every write, and that a changed account
re-reads the workspace.

## Performance Testing

- Verify switching does not mount more than one editor or trigger duplicate fetches.
- Verify rapid scroll/input changes do not write storage on every event without throttling.
- Verify long drafts remain responsive and storage failure does not block typing.

### Desktop split view follow-up (2026-10-28)

`DesktopSplitView.cy.tsx` uses synthetic notes and a mocked backend while
mounting the real controller, editor, and offline storage. It exercises two
side-by-side panes, deduplication, exit/close/third-tab behavior, separate
writes, failed save and recovery, navigation blocking, desktop/mobile resize,
editor instance continuity, long-note scrolling in both directions, note-ID
replacement, and the first save of an initially unsaved note. The focused
Allure run passed 13/13: `/tmp/everfreenote-split-browser-final-2/index.md`.
The focused workspace/controller/reader unit run passed 64/64 at
`/tmp/everfreenote-split-unit-focus/index.md`; the existing mobile layout
component suite passed 39/39 at `/tmp/everfreenote-split-mobile-focus/index.md`.
`npm run type-check` and `npm run eslint` passed as well.

An isolated Docker preview on port 3106 connected to the local synthetic
editor-preview database. Manual browser checks opened two sample notes,
activated a pane using Enter, and preserved a long note's 1266px scroll when
switching it from preview to reading. Final integration and independent QA
must also validate the combined editor design; no production data is used.

### In-flight saves (2026-10-28)

Independent QA reproduced on main and the split branch: an explicit flush
could return after an older in-flight save while a newer draft remained only in
memory. Regression cases hold local queue writes and check continued typing,
split and ordinary tab transitions, closing a tab, failure/retry, and the first
save of a new note. Core tests also cover reverting to the baseline, partial
failure, and session reset; web unit tests cover concurrent manual saves,
equal timestamps, different notes, and reopening with a pending queue.

These tests exercise local persistence and mocked or local services. They do
not establish cross-window/device ordering or real-device/remote sync behavior.

### Deletion while saving (2026-10-29)

`DeletePendingSave.cy.tsx` holds a split editor's queue write while deleting
one note or a selection. It verifies the delete waits for autosave and an
unchanged manual save, that failed saves cancel single and bulk deletion,
that retry succeeds, and that deleting an unrelated note does not wait for
the active editor. `useNoteBulkActions.test.tsx` also verifies a failed guard
prevents online deletes. These tests use mocked network and controlled local
storage writes; they do not prove ordering across browser windows or devices.
Offline queue compaction and bulk queue persistence are tested separately.

### Authentication and reload (2026-10-29)

`useNoteWorkspaceHydration.test.tsx` covers a null-to-user transition with
open, closed, dirty and failed tabs; account changes; sign-out and re-entry;
and unavailable or unreadable storage. A controller regression checks the
intermediate render where the provider has switched accounts but the auth
hook has not caught up. `WorkspaceAuthHydration.cy.tsx` mounts the real app
and controller with a delayed mocked provider and checks both restored tabs
and the active note. A real Supabase session and browser reload require an
independent runtime check; the component test does not model Google OAuth.

### Safe sign-out (2026-10-29)

`SignOutDraftSafety.cy.tsx` covers immediate save before logout, failed and
restored dirty drafts, multiple tabs, deliberate discard, retry, cancellation
during a slow write, account changes, offline writes and sign-out failure.
`SettingsSignOutSafety.cy.tsx` exercises the mobile dialog and its initial
focus; settings and auth unit tests cover unreadable storage and error return
values. These tests use a mocked identity provider and controlled local I/O;
they do not establish cross-window ordering or real Google OAuth behavior.

The component suite also checks that a failed save blocks tag filtering and
keeps the editor visible after a desktop-to-mobile resize; a subsequent
successful retry saves the draft and applies the tag filter.

Controller tests cover the 2 MB workspace limit evicting an unfinished tab,
an older or unreadable snapshot, a recoverable snapshot, typing while another
write is pending, and an account switch during navigation. A component test simulates a
quota failure after eviction and checks that Settings stays closed and that
discarding the tab requires confirmation. Shell tests exercise ordinary
Settings, the AI Search reindex action and the AI Index return path. A real
browser smoke on the earlier authentication candidate exercised Back, Forward
and reload for a saved note; browser history and reload with an unrecoverable
draft are not protected by the app-controlled route guard and still require
independent validation.

The final local run passed 1022 web unit tests and 101 component tests;
type-check and ESLint passed. Allure reports are
`/tmp/everfreenote-signout-final-web-unit-2/index.md` and
`/tmp/everfreenote-signout-final-components-3/index.md`.

### Account-session isolation (2026-10-29)

`AccountSessionIsolation.cy.tsx` covers delayed and not-yet-started saves on
account change, returning before a delayed write finishes (including a new
note's create followed by an update with the same ID), same-account token
refresh and explicit discard. Unit tests
cover owner/note ordering across remounts, auth epoch and query-cache changes,
late sign-out/navigation, and account-scoped Settings/AI return state.

A separate local Supabase browser test uses two synthetic password accounts:
A→B with a delayed IndexedDB operation, A→B→A with overlapping saves,
pending input before autosave, and deliberate discard after a simulated local
write error. It also checks B's server response and absence of A in B's UI.
Offline state and local failures are simulated. These tests do not establish
Google OAuth behavior, cross-window ordering, server sync, or durability when
local storage is unavailable.

The final local checks passed 732 core and 1,034 web unit tests; the combined
account/settings/split/mobile component run passed 73 tests, and the final
account-isolation suite passed 6. Type-check and ESLint passed. A broader
150-test component run passed before the separate one-line overlay owner fix.

### Combined tag and session boundary

Controller regression tests delay the initial cache read or the first eight tag writes, change the session epoch, and check that no later write or reconciliation starts. An A→B→A test verifies the unfinished/uncertain marker is visible only to A and requests review after reconciliation. These are deterministic mocked boundary tests; independent integrated real-auth and IndexedDB coverage remains required.

### Same-document history fallback

Unit tests cover owner and epoch isolation, synchronous editor capture, the
first-create identity, preserving the other tab on discard, and best-effort
`beforeunload` registration for any owner's volatile draft without exposing its
contents. The isolated local-Supabase browser scenarios
exercise actual App Router Back/Forward with simulated IndexedDB and
sessionStorage failures, Settings sign-out, A→B→A, a delayed first create,
repeat save, continued typing, and a failed first create retried to the test
server. Additional scenarios cover discarding before a queued write begins,
signing back in while it remains pending, and warning when a write already
inside the adapter may still finish. The browser tests use synthetic accounts and an isolated local API;
they do not prove reload durability, cross-window behavior or mobile native
dialog availability. Their Cypress runner currently has no Allure E2E adapter;
use the raw Cypress output and treat the Allure no-tests finding as unresolved.

The focused local run passed 175 unit and 57 component tests through Allure.
The separate history and first-create browser suites each passed 6/6 in raw
Cypress. Desktop Chrome also showed its native generic warning after A→B,
without exposing A's draft, and did not warn for a clean editor. The browser
checks used an isolated local Supabase instance and synthetic accounts.

Autosave feedback also follows the account session: a controlled pending save
cannot publish or dismiss a toast after its session changes, while a failure
in the current session still reports an error. A Chromium test with synthetic
accounts switches A→B→A after an offline local-save failure, checks that B
sees neither A's draft nor its failure toast, then forces another failed write
and verifies that A sees the new error. This does not cover cross-window UI.
