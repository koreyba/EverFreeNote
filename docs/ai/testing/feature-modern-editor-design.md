---
phase: testing
title: Testing Strategy
description: Define testing approach and verify the modern editor redesign features across devices.
---

# Testing Strategy

## Test Coverage Goals
- **Unit Tests**: Ensure all existing unit tests in `ui/web/tests/unit` continue to pass.
- **Component Tests**: Check component rendering and interaction on mobile vs desktop.
- **Manual Checklist**: Create a robust QA checklist for visual validation in Light & Dark modes on different viewports.

## Unit & Component Tests
- Ensure that the following component test suites in `cypress/component/` pass with the new layout:
  - `Sidebar.cy.tsx` (checks search trigger, settings button, sync dot indicator, and displays count)
  - `NoteCard.cy.tsx` (checks compact/search variants, rank, tags, selection highlights)
  - `EmptyState.cy.tsx` (checks logo rendering and new 2-line placeholder messaging)
  - `SelectionModeActions.cy.tsx` (checks selection Mode counts, Deleting state labels, and buttons)
  - `NoteView.cy.tsx` (checks reading mode header, copy functionality, tag display scroll)
  - `NoteEditor.cy.tsx` (checks autosave status, tag inputs suggestions list, title input interactions)
- **Unit testing coverage**: `richTextEditor.test.tsx` (Jest unit test verifying TipTap initialization and selection markdown conversion).
  - *Status (2026-07-10)*: **Passed** (unit-tests-core, unit-tests-web, unit-tests-mobile, component-tests).
  - *Code Quality (2026-07-10)*: **Passed** type-check, ESLint (Analyze), and SonarCloud Code Analysis.
- **Gaps & E2E Validation**: End-to-end integration flows (crud, full-text tag filtering) are automated in a separate repository (`koreyba/EverFreeNote-e2e`). Since we updated text strings and added data-testids (e.g. `search-panel-clear-tag`), visual E2E changes should be verified on CI.
  - *Status (2026-07-10)*: E2E Tests (PR Preview) **Passed** 99.74%.
  - *Coverage Gaps*: Remaining visual coverage gaps (animations, light/dark mode transitions, responsive breakpoint collapsing behavior) are covered by manual checklists below.

## Manual Verification Checklist
Verify the following features in **both Light and Dark modes**:

### 1. Main Window & Sidebar (Desktop vs Mobile)
- [ ] Sidebar logo and name are aligned.
- [ ] Sync status pill displays correctly (Synchronized / Syncing / Offline) and looks clean.
- [ ] Search trigger button has clean hover state. Clicking it successfully opens the Search results panel.
- [ ] Note count indicator is centered or appropriately aligned.
- [ ] "New Note" button stands out and has micro-animations (e.g. scale on hover, ripple effect).
- [ ] User profile bar is neat, email is truncated if long, settings/logout buttons have clear tooltip/labels.

### 2. Note List & Cards
- [ ] NoteCard displays Title, description snippet, tags, and date cleanly.
- [ ] Selected note card stands out via a subtle background highlight and/or border accent.
- [ ] Hovering over a card shows visual feedback.
- [ ] Virtual scrolling works smoothly without layout shifts.

### 3. Note Reader (NoteView)
- [ ] Header shows title status and actions (Edit, Copy, Delete, More).
- [ ] Content is centered in a `max-w-3xl` or `max-w-4xl` wrapper on desktop for comfortable reading.
- [ ] Typography (headers, lists, body text) looks modern with correct line heights.
- [ ] Tag elements are displayed horizontally and can be scrolled if many exist.

### 4. Note Editor (NoteEditor)
- [ ] Title input has no harsh borders, but has a subtle highlight when focused.
- [ ] Tiptap editor toolbar is clean and responsive.
- [ ] Editor workspace is comfortable and expands to fill the viewport height properly.
- [ ] Autosave/Saving status indicator is visible and behaves correctly.

### 5. Mobile Responsiveness
- [ ] Mobile view displays the sidebar only by default.
- [ ] Selecting a note opens it full-screen and hides the sidebar.
- [ ] Back button in the note view/editor header successfully returns to the note list.
- [ ] Touch targets are at least 44x44px.

## Test Reporting
- Execute verification commands:
  - `npm run test:unit:web`
  - `npm run type-check`
  - `npm run eslint`


## October 2026 continuous-document validation

Fresh local evidence:
- 89 Cypress component tests passed across NoteDocumentDesign, NoteEditor, NoteView, NoteEditorSaveExit and MobileLayout; no failures/skips/retries.
- 39 targeted Jest tests passed for noteFind, TagInput, NoteEditor and NoteView.
- Full `npm run type-check`, `npx eslint . --max-warnings=0` and `git diff --check` passed.
- New regressions first failed for clipped titles, absent tag disclosure and textarea-title search, then passed. A separate paste regression first failed without the normalization handler, then passed with exact save/autosave and native undo checks.

The report at `/tmp/editor-design-final-components/awesome/index.html` contains 128 tests: 89 Cypress tests plus the 39 Jest tests discovered from the concurrent unit run. Its manifest was checked by framework; this is not 128 component tests. Unit overview: `/tmp/editor-design-final-unit/index.md`. The final focused design rerun is `/tmp/editor-design-final-design/index.md` (includes the selector correction required by Cypress's TypeScript configuration).

Covered states: light/dark editing and reading; 1280px desktop, 390px phone and 320px narrow phone; the full Russian title from the user's example and 12 tags; disclosure/add/remove/filter operations; complete title without horizontal or vertical clipping; matching reader/editor body geometry; paste CR/LF normalization without rewriting an existing newline-containing title; native undo; autosave; search in changed wrapping title; empty-canvas click/typing; long content and images; simulated VisualViewport keyboard and safe-area changes.

Read-only app smoke: local demo preview at `http://127.0.0.1:3104` against the local 54321 backend, opening the existing long-title/12-tag note in reading and editing at 390px and 320px. No demo-note content was changed. Real Android/iOS keyboard and IME behavior and exact integrated-head CI remain separate checks.

Screenshots are attached to the Cypress report and stored under `cypress/screenshots/NoteDocumentDesign.cy.tsx/` (document-mobile, document-reader-mobile, document-desktop, document-reader-desktop and document-mobile-320-full-title variants). Generated reports/screenshots and local dependency links are not committed.

## Image accessibility follow-up
Component coverage checks editor semantics, unchanged content on cancel, multiple images, stale-position protection, device/URL/HTML clipboard insertion, descriptions, explicit decorative choice and reopen. Unit coverage checks reading views and clipboard preservation. Separate Chrome keyboard and accessibility-tree checks use isolated synthetic content at narrow/mobile/desktop sizes; they do not prove physical-device, screen-reader, native bitmap clipboard or backend persistence behavior.

Local results: 13 final styled dialog component tests, 61 targeted web unit tests, 35 existing core sanitizer tests, full type-check and ESLint passed. A broader earlier component run passed 104 tests; the final dialog-only rerun supersedes its dialog coverage after safe-area adjustments. Screenshots and detailed evidence are kept outside the repository.

## Image dimensions follow-up
Mobile and desktop component tests compare reading/editing geometry for small, non-square, responsive, width-only and height-only images. Sanitizer, clipboard, MCP and ENEX tests exercise valid/invalid pixel values, adversarial attributes, mixed image resources, failed downloads, descriptions and XML escaping. A synthetic account on an isolated local API verified saved sizes, tags and content after reload; it was deleted afterward. Physical devices, third-party WordPress and exact integrated-head CI remain separate checks.

Local validation: full unit-core 843/843; targeted web/core 178/178; component 3/3; full type-check, ESLint and Deno check for the MCP function passed. Synthetic browser export decoded a local data image and used stubbed remote URLs; no external image requests were made.

Note: the existing DOMPurify XML-safety policy removes an `alt` containing a literal `]]>` sequence.

## Responsive height-only images

Responsive component coverage checks small and large height-only images with square, wide and tall intrinsic ratios at 320, 390 and 1200 px in reading and editing; it also checks delayed loading, shared notes and the inactive split pane. The editor is checked for unchanged HTML, no content-change event from loading, and working keyboard input. Unit tests cover separate images sharing a source, positional changes, replacement, undo, invalid values and reading/clipboard/ENEX behavior. Local results: responsive component 5/5, earlier image accessibility and dimensions component suites 16/16, targeted web unit 46/46, full type-check and ESLint. Exact integrated-head, physical-device and independent real-API checks remain separate.

## October 29 correction verification
Base: fd5bf745d1582e82fc013ae39a35aa3674da1c72. A synthetic React-only editor/reader fixture was served on 3124 using an unreachable dummy Supabase URL; no user notes or 3122 were touched.

Manual Chrome: 320px Add preserves collapsed tags; add/remove, Escape, Bold via compact toolbar and switch to reading worked. At 1280px six tags fit instead of the prior fixed three. Focused editor computed box-shadow is none; genuine blockquote border remains 4px. Desktop editing/reading checked in light/dark. Before/after captures are in `/tmp/editor-focus-evidence`; the browser viewport screenshot API produced reduced mobile images, so independent QA should capture its own phone evidence.

Focused Cypress covers 280/320/390/1280/1600 widths, actual overflow, all-fit without disclosure, resize/font event, long labels, independent input/disclosure, cancel/add/remove/filter and retained full tags. Existing keyboard/autosave tests now explicitly open Add; the old Add-expands-list expectation was replaced with independent disclosure. Existing unit tests use measured geometry for overflow and inspect the restored badge background for backspace highlight. Final reports: `/tmp/editor-tags-final-components` (49/49 component cases) and `/tmp/editor-tags-unit-focused` (20/20 unit cases). Root TypeScript check, scoped ESLint and diff whitespace checks passed. The first unit invocation's npm wrapper dropped forwarding flags and ran the full web suite; its five failures were outdated tag assertions, corrected and verified in the focused rerun. No CI or native-device acceptance claimed.

### Follow-up: removal hit areas and resize fallback
Removal buttons now measure 44×44 CSS pixels while retaining compact pill backgrounds and 12px icons. Manual synthetic Chrome checks at 390px and 1280px confirmed all 12 targets, no overlap with adjacent filter controls, working left/right hit edges, add/remove, and no horizontal overflow. `NoteTagList` also listens to window resize when ResizeObserver is unavailable, removing the listener on cleanup. Three focused component cases passed, including fallback resize/cleanup and target measurements; root TypeScript, scoped ESLint and diff checks passed. Report: `/tmp/editor-tag-hit-target/awesome/index.html`; screenshots: `/tmp/editor-focus-evidence/followup-mobile-dark-targets.png` and `/tmp/editor-focus-evidence/followup-desktop-dark-targets.png`.

## Tag entry completion and order

On macOS ARM64 with Electron, 32 focused Jest tests and 37 focused Cypress cases passed without retries. They cover Enter, comma, suggestions, Tab, Escape, blur, duplicate tags, IME composition and save payload order. The styled 320px editor test checks that the most recently confirmed tag is visible while the longer list remains collapsed; batch submissions keep the submitted order. These component tests use a synthetic note and do not by themselves prove persistence through a real database or behavior on a physical phone.
