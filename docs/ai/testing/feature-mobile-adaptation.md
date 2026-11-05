---
phase: testing
title: Testing Strategy - Mobile Adaptation
description: Define testing approach, test cases, and quality assurance for mobile adaptation
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Unit Tests**: Verify `MobileHeader` renders and triggers events.
- **Integration Tests**: Verify the Sidebar opens/closes on mobile.
- **End-to-End**: Verify the full mobile flow (Open Menu -> Select Filter -> View List).

## Unit Tests
**What individual components need testing?**

### MobileHeader
- [ ] Renders a menu button.
- [ ] Menu button has correct aria-label.

## Integration Tests
**How do we test component interactions?**

- [ ] **Mobile Layout**:
    - Set viewport to 375x667 (iPhone SE).
    - Verify Desktop Sidebar is hidden.
    - Verify Mobile Header is visible.
    - Click Menu button -> Verify Sheet opens.
    - Click inside Sheet (e.g., "New Note") -> Verify action occurs.

## End-to-End Tests
**What user flows need validation?**

- [ ] **Responsive Check**: Resize window from 1024px to 375px and back. Ensure layout adapts without refresh.

## Manual Testing
**What requires human validation?**

- Check touch targets on actual mobile device or simulator.
- Verify "Clear Search" button inside the Sidebar (in Sheet) works on mobile.

## Mobile web usability validation — 2026-10-28

- Local Docker web app and Supabase: manually exercised note creation and save, Notes/Search/Tags/Settings transitions, tag results, selection, and the delete confirmation. Checked 320×667 and 390×844 layouts, the 1280×900 desktop layout, Settings reload, and desktop-to-mobile resizing. Long press was exercised with browser touch emulation.
- Cypress component regression: 132 passed, 0 failed across mobile layout and navigation, offline notes, note controls, search, selection, and long press. The 320 px test checks 44×44 px reading and editing action targets.
- Jest core and web unit suites: 212 suites, 1,766 tests passed. The Allure agent output recorded 1,692 logical results for the same run; Jest's full runner count is reported separately.
- `npm run type-check`, `npx eslint . --max-warnings=0`, and a clean Docker production build passed.
- Follow-up: 141 mobile and note component tests passed for swipe-to-reveal deletion, confirmation, search in read/edit modes, fallback highlighting, mobile navigation, and 320 px action targets. After adding Find to the expanded editor, 35 related component tests passed. Manually checked in-note search and highlighting in the local Docker app at 320 and 390 px, including expanded editing.
- PR review: verified that Enter in the find field advances matches while keyboard activation of the Previous and Close buttons remains available.
- Returning from a note shows a neutral mobile tab heading; reopening the saved tab restores the note and its title. Verified in Cypress and in the local Docker app at 390×844.
- Tile view: exercise layout switching, opening notes, selection, swipe confirmation, long lists and pagination. Manually inspected at 320×667 and 390×844, including a saved note with a long title and 12 tags.
- The user confirmed the swipe works in a browser.
- Outstanding: validate swipe and the on-screen keyboard on physical iOS and Android browsers; browser touch emulation could not complete a native drag in the in-app browser.

## Continuous note editing canvas — 2026-10-28

- Mobile and desktop component checks cover short and long notes, the editable canvas, save, toolbar position, caret placement, theme and focus. A simulated safe-area inset and resized visual viewport cover the mobile navigation and keyboard layout; an additional scenario checks an image in the canvas.
- The focused mobile layout and rich-text rendering run passed 45 tests. In a broader 142-test editor run, 137 passed and five keyboard undo/redo scenarios failed or broke on macOS; one of those failures was also reproduced using the original editor files from `origin/main`.
- Type-check, ESLint, and a production build in an isolated Docker container passed. Physical iOS and Android keyboard/safe-area behavior remains to be checked on devices.

## Mobile tile and Tags layout — 2026-11-05

- Reproduced overlapping rows on unchanged `main` (`bd30c2716af`) at 320 px with a 20 px root font (125%), both with and without selection. The next row started at 205 px while the preceding card extended to 214.625 px. The same cases pass with measured row heights.
- `MobileContentLayout.cy.tsx` checks 320/390 px grids, complete dates below tags, enlarged text, selection, 44 px Tags buttons, callbacks, loading guards and cache notices. Screenshots capture the layouts.
- Focused Cypress run: 31 passed, 0 failed across the new layout spec, `MobileNotesGrid`, `NoteCard`, `NoteList`, `NoteListVirtualization` and `NoteListPagination`.
- Web unit run: 148 suites / 1,300 tests passed, including `tagsPage.test.tsx`. npm consumed the intended Jest scope flags, so this ran the full web unit suite.
- `npm run type-check`, `npx eslint . --max-warnings=0`, `git diff --check` and `npm run build` passed (exit 0). The static build used placeholder public Supabase configuration and proves compilation/export, not backend connectivity.
- Outstanding: rebuild the Android APK and confirm on the user's physical phone; no installed-app validation is claimed.
