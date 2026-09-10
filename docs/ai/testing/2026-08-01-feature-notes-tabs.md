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

## Performance Testing

- Verify switching does not mount more than one editor or trigger duplicate fetches.
- Verify rapid scroll/input changes do not write storage on every event without throttling.
- Verify long drafts remain responsive and storage failure does not block typing.
