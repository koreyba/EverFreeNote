---
phase: testing
title: Mobile editor layout validation
description: Browser acceptance, unit regression, coverage and platform evidence limits
---

# Mobile editor layout validation

## Test Coverage Goals
Prove all four requested behaviors using rendered application CSS and the real Tiptap editor. Browser component tests cover geometry and commands; unit tests cover scroll/viewport boundary logic. Full coverage is a target, not a claim about the whole application.

## Unit Tests
- 914/914 web and shell-runtime unit cases passed on 2026-09-22, exit 0.
- New navigation cases cover movement thresholds, reversals, independent scroll surfaces, popup/horizontal exclusion, view reset, desktop behavior, rubber-band offsets and bottom clamping.
- New viewport cases cover keyboard resize/panning, unchanged events, pinch zoom, absent VisualViewport and listener cleanup on desktop transition.
- Coverage before the fullscreen follow-up of MobileWorkspace and useMobileViewport: 100% statements, lines and functions; 98.07% branches. The uncovered unit branch is the workspace keyboard data attribute; the browser keyboard scenario exercises that integration. This percentage does not describe all changed files.
- The existing EditorMenuBar unit cases still verify desktop formatting commands after adding the formatting-state subscription.

## Browser Integration Tests
26/26 Cypress cases passed with the actual application stylesheet, exit 0, no retries or skips in the final run.
- [x] The final paragraph of a long edited note scrolls above both navigation and formatting controls.
- [x] Save remains the hit-test target while tags scroll under the action header.
- [x] Downward scrolling hides navigation, upward scrolling restores it, and visible navigation reserves layout space.
- [x] A 320px-wide phone gets a single horizontally scrollable toolbar row with 44px touch targets.
- [x] Heading/alignment menus apply commands to actual editor text and show current formatting state.
- [x] Bullet/numbered list transitions and list removal retain text; No list does not reset an unrelated heading.
- [x] Selection survives formatting and undo/redo.
- [x] A simulated 480px keyboard viewport with 24px panning keeps the footer and final text reachable, then restores full height.
- [x] Desktop heading buttons and sticky top toolbar remain available.
- [x] Upward-opening menus, dismissal focus and the dark mobile layout were checked; screenshots were visually inspected.
- [x] Existing mobile tabs, reading/editing transitions, back controls and discard dialogs remain covered.

- [x] Independent Bold/Italic/Underline/Strikethrough combine in one menu; removing one preserves the others.
- [x] The compact Aa trigger retains current font state in its menu.
- [x] Touch movement and mouse dragging from compound controls do not open them; normal clicks and keyboard activation still work.
- [x] Fullscreen editing hides chrome, keeps the same editor/draft mounted, exposes the last paragraph and restores the original title/actions. The collapse button remains reachable after horizontal scrolling and keyboard resize; Escape exits.

## End-to-End Boundary
These browser tests mount the real shell/editor with a local controller and Supabase test boundary. They do not prove a real backend round trip. Installed Android and physical-device evidence are recorded separately below.

Local preview smoke check: the development server at http://localhost:3147 uses the existing local Supabase at http://127.0.0.1:54321. Both configured test accounts successfully authenticated. The browser Test Login flow loaded 26 existing notes, and a long note was opened in the mobile editor for user review. Test-auth configuration is confined to the ignored .env.development.local file. No users needed creation and no note content was changed during this check.

## Execution Receipts
Final isolated Allure runs have matched expected scope, complete runtime modeling and zero findings:
- [Browser report](../../../.tmp-artifacts/mobile-editor-autosave-green/awesome/index.html), [agent overview](../../../.tmp-artifacts/mobile-editor-autosave-green/index.md).
- [Unit report](../../../.tmp-artifacts/mobile-editor-reviewed-unit/awesome/index.html), [agent overview](../../../.tmp-artifacts/mobile-editor-reviewed-unit/index.md).
These are local artifacts in this worktree, not committed report files.

Commands: `npx jest --config jest.config.cjs --selectProjects unit-web --runInBand`; `npx cypress run --component --browser electron --spec cypress/component/features/mobile/MobileLayout.cy.tsx`, both executed via Allure agent with explicit expected counts.

`npm run type-check`, `npm run type-check:tests`, `npx eslint . --max-warnings=0` and `git diff --check` passed. `npm --prefix ui/shell run android:dev` completed a fresh production static export and Gradle debug APK assembly with the ignored local-test environment. No credentials or APK assets are committed.

## Regression Evidence
Before fixes, real-CSS tests failed for end-of-note occlusion, tag/header hit-testing and toolbar wrapping. Keyboard simulation separately failed before viewport sizing was added. Review regressions caught No list clearing headings and stale list state on sequential commands; both pass with the final implementation.

## Harness Notes
The prior mobile spec did not load application CSS. The spec now imports it, and the Cypress host includes the Next style-loader anchor. Jest now supplies matchMedia. The viewport fixture restores the original browser property after each case. Final Allure runs were serialized because overlapping runs in the same project can mix results; only the isolated matched-scope reports above are completion evidence.

## Final Review
Requirements and design match the implementation. No remaining blocking finding in the changed code. No backend, persisted-note schema or native build configuration was changed. Remaining confidence limits are listed above.

## Native Android Keyboard Receipt
On 2026-09-22, built and installed the final dev APK on the Pixel 7 Android 36 emulator (com.everfreenote.shell.mobilelayout), using local Supabase and existing test accounts. Docked Gboard was opened by tapping the editor, not by mocking VisualViewport.
- The WebView visible height changed from 839.24px to 527.24px. Android reported the IME visible at physical y=1517..2400.
- Expanded editor scroller began at y=0; toolbar occupied y=475.24..527.24 and collapse control y=479.24..523.24. The final paragraph ended at y=434.05, above the toolbar.
- A real ADB touchscreen swipe beginning on a compound control moved scrollLeft to 45.33px with zero open menus; the collapse control stayed fixed.
- Tapping collapse with the keyboard still open restored the action header, retained the 527.24px viewport and kept formatting above the keyboard. Hiding the IME restored the full 839.24px viewport.
- Screenshots were inspected: `.tmp-artifacts/android-expanded-keyboard-final.png`. The dev APK and screenshots are local ignored artifacts, not release assets.
Android resizes both layout and visual viewports; the occlusion-derived keyboard flag can remain false in that configuration, while actual visible geometry remains correct. The floating stylus handwriting palette was excluded from docked-keyboard claims because it intentionally overlays content rather than reserving a keyboard viewport.
Physical Android hardware and iOS Safari were not available; browser viewport tests plus Android emulator IME evidence do not establish those platforms.

## Final review follow-up
A new red/green browser regression covers first autosave assigning an ID to a new expanded note. Expansion now follows the editing session instead of the workspace view key, so autosave does not collapse it. Test fixture DOM access uses explicit failures instead of non-null assertions; deterministic paragraph HTML is built with textContent.
Codacy Cloud CLI had no configured API token, so remote findings were retrieved through the GitHub check annotations. Local Codacy analysis was partial: Stylelint passed; the bundled ESLint adapter lacked TypeScript parser services and reported HTML-flow noise on existing editor/test code, while four additional tool binaries were unavailable. These are not claimed as passing scans. Repository ESLint and the CI quality checks remain separate receipts.
