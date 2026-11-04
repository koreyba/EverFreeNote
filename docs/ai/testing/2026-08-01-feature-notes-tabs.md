---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Linux drag-scroll regression (2026-11-04)

Exact-head `156e1204aea` CI again passed 1,140/1,146 components. The offline
deletion scenario and Sonar analysis passed; five save-barrier cases remained
red, alongside the native edge-scroll case. Removing fake clocks did not
resolve the CI save stalls, so they remain under investigation.

An isolated Linux arm64 Cypress 15.18.1/Node 24.18.0 container reproduced the
native edge-scroll failure exactly (`scrollLeft=2224`, expected below 2145).
The five selected save cases passed there, which does not establish their
correctness under the full amd64 CI run.

A new unit case reproduced a resize observer revealing the active tab during
dragging. The strip now suppresses that reveal while a tab drag is active,
still updates overflow affordances, and permits reveal after cancellation.
The 18-case unit suite and four-case macOS browser suite passed. With only
the production guard copied into the Linux fixture, the original failing
native test passed unchanged, without additional browser flags. These final
runs have matched Allure scope, complete modeling and no findings. Reports
are retained in `pr-207-ci-156e120` as `resize-drag-green`,
`resize-drag-browser` and `linux-resize-drag`.

The full Linux context also reproduced the CI timing signature: typing
`Second changed` took 13,258 ms. That exploratory run was stopped after nine
completed cases once the scheduling problem was captured; its expected-50
scope failed, so it is not a passing regression run. Changing only Electron
launch switches initially reduced the same action to 209 ms. The supported
`ELECTRON_EXTRA_LAUNCH_ARGS` foreground-scheduling switches tested were:
`--disable-background-timer-throttling`, `--disable-renderer-backgrounding`
and `--disable-backgrounding-occluded-windows`. Later cases still showed
one-second keystroke delays and the slow-save barrier failed again. This
experiment was stopped after reproducing the failure and is not a passing
regression. These switches were not retained in CI. Assertions, retries and
timeouts remain unchanged; background scheduling remains under investigation.
See the [Cypress launch documentation](https://docs.cypress.io/api/node-events/browser-launch-api#Modify-Electron-app-switches)
and [Electron background scheduling](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility).

Running the identical complete 50-case scope with `--headed` inside Xvfb,
without those experimental switches, passed 50/50 with coverage enabled and
no retries. Allure expectations matched, runtime modeling was complete and
there were no findings (`linux-headed/awesome/index.html`). Component CI now
uses that visible virtual-display mode; the fixtures, assertions, coverage,
retries and timeout budgets are unchanged. This validates the Linux arm64
reproduction; the new exact-head amd64 CI run remains the merge gate.

## PR #207 CI save-barrier follow-up (2026-11-03)

Exact-head `69348f18d98` CI recorded 1,140/1,146 passing component tests:
five Split View cases timed out before reaching their controlled queue-write
barrier, and the offline reconnect/delete case read a retained tombstone.
All six passed locally with coverage enabled. Four storage cases also passed
at 6x CPU throttling; the separately instrumented slow-save case passed at
20x throttling. Those experiments do not establish the Linux timeout cause.

The seven storage-concurrency scenarios affected across the two CI runs now
leave timers running and wait for their existing held queue writes. Exact
write counts, newest-draft/tag/image persistence, active-pane retention and
failure/retry assertions are unchanged. Debounce-specific tests retain their
fake clocks. This fixture adjustment requires a new exact-head CI result;
a local pass alone does not prove the previous CI timeouts are resolved.

After the fixture changes and three Sonar fixes, the exact three-spec Cypress
scope passed 67/67 with coverage enabled and no retries. The first invocation
misspelled the Sidebar path and ran 52/52; Allure rejected its expected count,
so the corrected full scope was run before acceptance. Controller, Sidebar and
NotesShell unit tests passed 126/126. Both final reports have matched scope,
complete runtime modeling and no findings. Production type-check, full ESLint
and whitespace checks passed. Reports are retained as `final-component-green`
and `final-unit-green` in the chat's `pr-207-ci-69348f` evidence directory.

Sonar's direct callback warning is addressed by explicitly forwarding only the
note ID, and the status-color priority uses flat conditions. Qodana did not
analyze this CI head: its Cloud server rejected the configured license token.
That external failure and Codacy's complexity budget remain independent gates.

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

## Manual save and creation acknowledgement

Component tests cover manual alt/title saves, unchanged HTML and clipboard, pending input, failed writes, account/note changes, older/newer autosave ordering, and a new note receiving an ID during typing. A local-API browser run with an isolated synthetic account also delays the local write with an IndexedDB lock, verifies the newest text reaches one created note, and checks saved/unsaved warnings and split-pane transitions. The synthetic account is removed after the test. Integrated-head CI and physical-device verification are separate.
### Split layout restoration (2026-10-29)

`noteWorkspaceSplitLayout.test.ts` covers old snapshots, owner stamps,
malformed or missing panes, duplicate note IDs, an empty pane and tab eviction.
`workspaceSplitMemory.test.tsx` covers A→B→A and a failed storage write after
closing split. `SplitLayoutPersistence.cy.tsx` exercises the real shell and
Settings page with synthetic notes and a mocked backend, including restored
editing/saving, in-flight save across an account change, storage read/write
failures, tab close and mobile→desktop. `WorkspaceAuthHydration.cy.tsx`
checks that no split is shown before matching account hydration.

The focused Allure run passed 162 unit and 70 component tests, including the
existing desktop split and mobile suites. A separate Electron browser test
against a production static export and synthetic intercepted backend passed
one end-to-end scenario: actual reload, Settings→Close, mobile reload and
desktop return, then explicit split close and another reload. A screenshot and
the browser test are retained with the local QA evidence. These checks do not
prove recovery after a reload when browser storage itself is unavailable.

### Split view preference (2026-10-29)

The focused browser component suite covers the default-off state, enabling and
disabling via Settings, retained tabs and drafts, restoration, A→B→A with a
shared browser preference, mobile and narrow desktop, storage failure, another
browser tab disabling the flag during live editing, and cancellation during a
pending editor flush. Existing desktop split, deletion, hydration and mobile
component suites are run with the preference explicitly enabled where needed.
The combined Allure component run passed 85/85 tests; the focused unit run
passed 175/175, including five Settings tests covering persistence and
read/write/storage-event failures. These
checks use synthetic notes and mocked network responses. A separate Electron
test against a production static export and an intercepted synthetic backend
passed an actual reload after enabling split, then disabling and reloading
again before re-enabling the retained layout. It does not validate Stage or a
real Supabase backend.

### Independent panes, drag/drop, and mobile regression (2026-11-03)

New coverage:

- Core split transitions retain displaced tabs, reuse existing sessions, swap visible peers, and reject stale targets or a full workspace without orphan tabs.
- Drag payload parsing rejects invalid, oversized, wrong-version, and foreign-owner data; ordinary text/file drops remain outside the note-drop handler.
- `SplitPaneInteractions.cy.tsx` exercises the real controller/shell: all reading tools, direct actions without Activate, the shared New Note destination, absence of the duplicate pane creation row, all four reading/editing combinations, separate title/body saves and first-create IDs, retained editor instances, all list/search/AI/tab drag sources, failed saves, and foreign-owner drops.
- At both 320 and 390 px, a live desktop pair becomes one visible mobile editor with a compact tab menu, hidden split controls, and no horizontal page overflow. Switching mobile tabs, editing, reduced viewport height, and saving work before desktop resizing restores both original editor instances and drafts.
- `MobileLayout.cy.tsx` covers mobile navigation, reading/editing actions, scrolling, toolbar selection/formatting, tab switching/closing, expanded editing, viewport/keyboard resizing, and failed-save dialogs.

Local evidence:

- Full core/web Jest run through Allure: 239 suites, 2,142 tests passed. One unchanged ENEX large-inline-image case failed in an earlier run, passed in isolation, then passed in the complete rerun; no ENEX fix is claimed.
- The six-spec browser regression ran 161 cases: all 73 mobile cases and both additional real-controller responsive cases passed, as did the other interaction, preference, hydration and persistence cases except one desktop save-failure test. That test needed to await each rejected durable write before triggering its next transition; its focused rerun passed 1/1 with complete Allure modeling and no findings. The broad run remains recorded as 160/161, rather than relabeled as a green run.
- Manual loopback preview at 390 and 320 px: one visible editor, compact tab menu, usable reading/editing tools, successful local save, and no horizontal page overflow. Returning to desktop displayed both editors. The extra pane heading/creation row was also visually absent.
- Final focused Jest regression after the shell compatibility adjustment: eight suites, 83/83 tests passed; Allure expectations matched with complete modeling and no findings.
- Production type-check, full ESLint, and `git diff --check` passed.

Reproduction commands (prefix each test command with `npx allure agent --goal "<scope>" --`):

```sh
npx jest --config jest.config.cjs --selectProjects unit-core unit-web --runInBand
npx cypress run --component --browser electron --spec "cypress/component/features/notes/DesktopSplitView.cy.tsx,cypress/component/features/notes/SplitPaneInteractions.cy.tsx,cypress/component/features/notes/SplitLayoutPersistence.cy.tsx,cypress/component/features/notes/SplitViewPreference.cy.tsx,cypress/component/features/notes/WorkspaceAuthHydration.cy.tsx,cypress/component/features/mobile/MobileLayout.cy.tsx"
```

Scope limits: network responses and notes are synthetic. Cypress drag/drop tests use native `DataTransfer` and the real source/target handlers; native pointer dragging was not independently established by the browser automation. Responsive checks emulate browser viewport dimensions, not a physical iOS/Android device or its keyboard. No CI, deployment, backend/auth integration, or new line-coverage percentage is claimed by this local pass.

### Under-title note dates (2026-11-03)

- TDD: three new reader tests first failed because the Note details trigger did not exist; all ten reader unit tests then passed. Coverage includes title/metadata/tag order, disclosure of both original timestamp values, Escape dismissal, refreshing relative time, and invalid imported timestamps.
- Full web unit regression through Allure (`npx jest --config jest.config.cjs --selectProjects unit-web --runInBand`): 148 suites and 1,290 tests passed; expectations matched, complete modeling, no findings.
- Five-spec Cypress regression: 154/156 initially passed. The two new layout cases lacked application CSS and a constrained scroll fixture; after fixing the fixture, the desktop click also needed `scrollBehavior: false` so Cypress would not top-align an already-visible trigger underneath the action bar. Assertions were retained.
- Final `NoteView.cy.tsx` rerun: 11/11 passed, no retries, complete Allure modeling, matched expectations and no findings. It proves a 44px mobile target, exact-date disclosure within 320px, Escape focus restoration, and scroll dismissal at offset 800 without jumping back to the title. Report retained as `note-dates-report.html` in this chat's local evidence directory.
- The other 145 browser regressions passed: adaptive tags 5, split interactions 21 (including per-note timestamps), desktop split 46, mobile layout 73.
- The initial browser bootstrap rejected the date-fns barrel's export-all declarations in the Next/Cypress loader. Importing the documented `date-fns/formatDistanceStrict` entry resolved that integration issue without changing test runner settings.
- Manual preview confirmed the actual application at desktop, 390px and 320px: compact dates beneath titles, no old footer, local-time details, and no horizontal overflow. The 320px popover remained between x=16 and x=304.
- Production type-check, full ESLint, focused final ESLint and `git diff --check` passed. No physical-device or CI claim is made.

### Pre-PR verification and split-toggle feedback (2026-11-03)

- The reported toggle regression was reproduced by a failing unit assertion: both modes rendered the same Columns icon. Split now uses a primary highlight and a rectangle action icon to return to single view; single view offers the Columns icon to open split. Action names and `aria-pressed` stay synchronized. Manual preview confirmed distinct SVG shapes, distinct backgrounds, and a successful round trip.
- The complete core/web checkpoint passed 239 suites and 2,145 tests. Its first run repeated the unchanged ENEX large-inline-image failure; that case passed in isolation and in the complete rerun. The ENEX implementation and assertions remain unchanged; this is an existing intermittent validation issue, not a fix in this feature.
- After the final toggle regression was added and fixed, the complete web suite passed 148 suites and 1,291 tests with matched Allure expectations, complete modeling and no findings.
- The final combined Electron run passed 178/178 cases across NoteView, NoteTagLayout, SplitPaneInteractions, DesktopSplitView, MobileLayout, SplitLayoutPersistence, SplitViewPreference and WorkspaceAuthHydration. Allure expectations matched with complete modeling and no findings. The report is retained as `split-view-pr-report.html` in the local evidence directory.
- Final production type-check, full ESLint and staged whitespace checks passed. The local `/split-preview/` demo is excluded from the feature commit. CI status is separate from these local results.

### Tab reordering and compact date/tag gap (2026-11-03)

- `noteWorkspaceTabReordering.test.ts` covers before/after moves, no-op/stale targets, unchanged tab/session objects, active/split identity, and a serialized round trip containing an unsaved draft. The new cases failed without the transition; the transition and existing split-layout cases then passed 12/12 through Allure.
- Three real-controller ordering cases first failed with non-draggable single-view tabs or unchanged order. After implementation, `SplitPaneInteractions.cy.tsx` passed 24/24. New assertions cover persisted ordering, active editor DOM/draft retention, unchanged left/right assignments, ordering with Split View disabled, and the shared mobile menu order. Existing pane-drop cases remain in this scope.
- `NotesTabReordering.cy.tsx` first passed three payload/insertion cases and failed the missing edge-scroll behavior. After implementation all four passed: overflow scrolling and cancellation, insertion after the final tab, foreign-owner rejection and ignoring note-list drags. The cancellation case verifies scrolling stops and original order remains.
- Manual loopback preview confirms a 4px metadata bottom margin with tags and the original 24px without tags. At both 320 and 390px the date button is 44px high, one note is visible and page width matches viewport width. Desktop and 320px screenshots are retained in this chat's local evidence directory.
- Final Allure regression passed 185/185 Electron cases across the nine ordering, split, mobile, date/tag, restoration, preference and hydration specs. Complete web unit coverage plus the three core workspace files passed 151 suites and 1,321 tests (1,291 web and 30 core). Both reports have matched expectations, complete modeling and no findings; evidence is retained as `tab-order-component-evidence` and `tab-order-unit-evidence` in the local evidence directory. Production type-check, full ESLint and whitespace checks also passed.
- Automated drags use native `DataTransfer` and the production handlers; physical pointer dragging and physical mobile devices are not independently verified. The backend and notes are synthetic. No line-coverage increase, deployment or remote CI result is claimed by these local runs.
- Pre-merge quality follow-up removes non-null assertions from DOM tab IDs and uses explicit undefined-returning fixture handlers. The ordering and real-controller split interaction specs pass 28/28 through Allure with matched expectations, complete modeling and no findings; production type-check and full ESLint also pass. Evidence is retained in `tab-order-quality-evidence` in the local evidence directory. Codacy continued to flag an unused parameter in the callback's type-only method signature, so the prop now derives its existing contract from the workspace hook rather than redeclaring parameter names. Remote Codacy analysis is checked separately.

### CI follow-up for PR #207 (2026-11-03)

- Exact-head CI at `b1feaa7b72c` passed 1,138/1,146 component cases and failed eight. Allure inspection modeled the entire result set: two Sidebar cases expected the superseded gray palette/generic tooltip, two OfflineNotes cases never checked server availability of a saved hidden editor, and four controlled split-save cases timed out waiting for their queue barrier.
- A coverage-enabled rerun selected those same eight cases: four split-save cases passed without changes, while the four Sidebar/OfflineNotes failures reproduced. Their original CI failures remain recorded; no timing fix for the four split-save cases is claimed.
- Sidebar browser expectations now follow the requested green/amber palette. Refresh distinguishes a retained clean hidden editor from a visible editor or unconfirmed input. Existing controller tests now assert actual existence-check requests, including a retained hidden editor ref, while retaining dirty/saving/error draft assertions.
- Final controller/refresh unit regression passes 107/107. The complete OfflineNotes spec with coverage passes 6/6, including both online/offline-created saved-note cases. Allure expectations match with complete modeling and no findings. Production type-check and full ESLint pass. Raw CI artifacts and local reproduction/fix evidence are retained under `pr-207-ci-b1feaa7` in this chat's local evidence directory; a new CI run is required after pushing the fix.
- The final combined Sidebar, DesktopSplitView and OfflineNotes run with coverage passes 67/67 without retries, complete modeling and no findings. Its report is retained under `pr-207-ci-b1feaa7/final-three-spec-green`. This local pass does not relabel the original CI run or establish a cause for the four save-barrier timeouts seen only in CI.
