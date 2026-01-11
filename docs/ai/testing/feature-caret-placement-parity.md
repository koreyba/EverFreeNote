---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target (default: 100% of new/changed code)
- Integration test scope (critical paths + error handling)
- End-to-end test scenarios (key user journeys)
- Alignment with requirements/design acceptance criteria

## Unit Tests
**What individual components need testing?**

### Component/Module 1
- [x] `placeCaretFromCoords` returns “handled=false” when coords are inside bounds and `posAtCoords` returns null
- [x] `placeCaretFromCoords` returns “handled=true” and dispatches selection when `posAtCoords` returns a position
- [x] Covers start/end fallback logic using editor bounds
- [x] Defensive behavior: exceptions return noop

Implementation: `ui/mobile/tests/unit/core-utils-prosemirrorCaret.test.ts`

### Component/Module 2
- [x] Web handler calls the helper only for background/root clicks
- [x] Web handler does not interfere with inside-text clicks
- [x] WebView/mobile editor uses the same helper for parity (background/root clicks only)

## Integration Tests
**How do we test component interactions?**

- [x] Web: click in an internal vertical gap between blocks should not jump to end
- [x] Web: click below last block should place caret at end
- [x] Web: click above first block places caret at start
- [x] Web: right-of-line click inside paragraph stays native and edits that paragraph
- [x] Mobile/WebView: parity checks for internal gap + bottom tail + above-first-block + right-of-line

Specs:
- `cypress/component/editor/RichTextEditor.cy.tsx`
- `cypress/component/RichTextEditorWebView.cy.tsx`

## End-to-End Tests
**What user flows need validation?**

- [x] User flow: headings + paragraphs; click in mid-gap; type; inserted near gap
- [x] User flow: click empty bottom area; type; appended at end
- [x] Regression: clicking inside text still places caret normally

## Test Data
**What data do we use for testing?**

- Simple HTML fixtures: `<h1>Title</h1><p>First</p><p>Second</p>`
- Ensure there is visible vertical gap (heading margin)

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run validate`
- Targeted Cypress component specs (web + webview)
- Record any flake risks and mitigations

Commands:
- `cd ui/mobile && npm test -- core-utils-prosemirrorCaret.test.ts`
- `npx cypress run --component --spec cypress/component/editor/RichTextEditor.cy.tsx`
- `npx cypress run --component --spec cypress/component/RichTextEditorWebView.cy.tsx`

## Manual Testing
**What requires human validation?**

- Web
  - Click in horizontal empty area to the right of a line → caret to end of that line/block
  - Click in vertical gaps between blocks → caret near that gap, no jump to end
  - Click below content → caret to end
- Mobile
  - Repeat the same scenarios with taps

## Performance Testing
**How do we validate performance?**

- Not required; the feature is O(1) per click.

## Bug Tracking
**How do we manage issues?**

- Log regressions as separate issues with repro steps and a minimal HTML snippet.
