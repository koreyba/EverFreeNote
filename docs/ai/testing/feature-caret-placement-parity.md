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
- [ ] Test case 1: `placeCaretFromCoords` returns “handled=false” when coords are outside and fallback is not applicable
- [ ] Test case 2: `placeCaretFromCoords` returns “handled=true” and dispatches selection when `posAtCoords` returns a position
- [ ] Additional coverage: start/end fallback logic using editor bounds

### Component/Module 2
- [ ] Web handler calls the helper only for background clicks
- [ ] Web handler does not interfere with inside-text clicks
- [ ] Mobile handler maps touch coordinates correctly

## Integration Tests
**How do we test component interactions?**

- [ ] Web: click in an internal vertical gap between blocks should not jump to end
- [ ] Web: click below last block should place caret at end
- [ ] Mobile/WebView: same scenarios as Web (depending on available harness)

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: Edit note with headings and paragraphs; click in mid-gap; type; inserted near gap
- [ ] User flow 2: Scroll to bottom; click empty bottom area; type; appended at end
- [ ] Regression of adjacent features: clicking inside text still places caret normally

## Test Data
**What data do we use for testing?**

- Simple HTML fixtures: `<h1>Title</h1><p>First</p><p>Second</p>`
- Ensure there is visible vertical gap (heading margin)

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run validate`
- Targeted Cypress component specs (web + webview)
- Record any flake risks and mitigations

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
