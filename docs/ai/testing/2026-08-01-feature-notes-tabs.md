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

- [ ] Open note A, add tab, open note B, switch A/B, and verify both contexts.
- [ ] Open note A from normal list, search, tag-only results, and AI/internal flow and verify one tab.
- [ ] Reload the same browser tab and verify order, active tab, mode, draft, and scroll.
- [ ] Close active tabs in both neighbor directions and close the final tab.
- [x] Use the compact mobile tab list to switch and close tabs.
- [x] Create a blank mobile tab, close the menu, and select a note from the visible list.

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

## Recorded Evidence

- Allure Agent workspace/model/UI run: 34/34 passed, expectations matched, findings 0. Report: `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-58hLNC`.
- Existing controller regression run under Allure Agent: 18/18 passed, findings 0. Report: `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-yHYkoU`.
- `npm run type-check`: passed, including root, core, web tests, and `ui/mobile`.
- Focused ESLint for changed source/test files: passed.
- Full unit coverage run: 184 suites and 1,430 tests passed; changed workspace/controller paths were exercised, including manual-save, autosave, Read error states, and oversized snapshot rejection.
- Targeted Chrome component run: 41/41 logical tests passed across NoteEditor, FTS exit-save, like-search exit-save, and AI open-in-context scenarios. The local Cypress process still returned exit 1 after the passing spec summaries; Allure attributed that to a runner-level webpack-dev-server bootstrap signal, with no assertion failures.
- `npx ai-devkit@latest lint --feature notes-tabs`: passed.
- Native mobile route/store tab adaptation was not included; responsive web mobile controls are covered by component tests.

- Desktop: keyboard tab navigation, ellipsis, horizontal overflow, dirty/error markers, close confirmation, and accessible capacity state with Add fixed on the left.
- Mobile viewport: active-note summary, tab count, compact list/sheet, touch targets, screen-reader labels.
- Reload: verify `sessionStorage` restore and separate browser-tab isolation.
- Network/offline: switch during autosave and after an induced save error.

## Performance Testing

- Verify switching does not mount more than one editor or trigger duplicate fetches.
- Verify rapid scroll/input changes do not write storage on every event without throttling.
- Verify long drafts remain responsive and storage failure does not block typing.
