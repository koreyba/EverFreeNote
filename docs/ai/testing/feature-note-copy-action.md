---
phase: testing
title: Testing Strategy - Note Copy Action
description: Testing plan for web/mobile note copy actions and EverFreeNote self-copy round-trip behavior.
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Target 100% coverage for new copy payload and self-copy detection logic.
- Integration coverage for:
  - web note action copy
  - mobile clipboard copy
  - self-copy paste round-trip
- Manual verification for clipboard behavior on real web/mobile environments.

## Unit Tests
**What individual components need testing?**

### NoteCopyService
- [ ] Builds rich HTML payload with EverFreeNote marker around note body HTML
- [ ] Builds readable plain-text fallback from the same note body
- [ ] Handles empty body safely
- [ ] Preserves supported structural HTML in the rich payload

### SmartPaste self-copy branch
- [ ] Detects EverFreeNote self-copy marker from raw clipboard HTML
- [ ] Preserves supported internal formatting beyond the generic external-source style allowlist
- [ ] Keeps generic external-source behavior unchanged when marker is absent
- [ ] Falls back safely if self-copy HTML is malformed

### Web note action handlers
- [ ] Reading mode copy uses persisted note body HTML
- [ ] Editing mode copy uses current unsaved editor draft HTML
- [ ] Success and failure feedback are emitted correctly

### Mobile copy path
- [x] Header copy resolves the latest unsaved editor HTML through `EditorWebViewHandle.getContent()`
- [x] Native clipboard write prefers `StringFormat.HTML`
- [x] Native clipboard write falls back to `StringFormat.PLAIN_TEXT` if HTML write fails

## Integration Tests
**How do we test component interactions?**

- [ ] Web reading mode: press `Copy` and verify clipboard writer receives rich + plain payload
- [ ] Web editing mode: dirty draft copy uses current editor content rather than initial persisted HTML
- [ ] Smart-paste round-trip: copy EverFreeNote payload -> paste into editor -> headings/lists/task lists/alignment survive where supported
- [ ] External-source regression: non-EverFreeNote HTML still follows generic sanitization rules
- [x] Mobile note screen: press header copy -> native clipboard writer receives HTML payload and success feedback returns
- [x] Mobile note screen: if HTML clipboard write fails, plain-text fallback is attempted
- [ ] Mobile fallback: copy failure produces feedback without breaking the editor session

## End-to-End Tests
**What user flows need validation?**

- [ ] Web: open note in reading mode -> copy -> open another note -> paste -> verify preserved formatting
- [ ] Web: edit note without saving -> copy -> paste into another note -> verify draft content was copied
- [ ] Mobile: open note -> copy from header -> paste into EverFreeNote target flow where supported/manual-verifiable
- [ ] Regression: existing share/delete/more actions still work in the updated headers

## Test Data
**What data do we use for testing?**

- Editor-emitted HTML fixtures covering:
  - headings
  - paragraph + inline styles
  - task lists
  - links
  - alignment/font metadata
- Mock clipboard APIs on web
- Mock Expo Clipboard and editor WebView `getContent()` on mobile

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Web validation:
  - `npm run test:unit:web -- --runTestsByPath ...`
- Core validation:
  - `npm run test:unit:core -- --runTestsByPath ...`
- Mobile validation:
  - `npm --prefix ui/mobile test -- ...`
- Completed focused validation:
  - `npx jest --config jest.config.cjs --selectProjects unit-core --runTestsByPath core/tests/unit/core-services-noteCopy.test.ts core/tests/unit/core-services-sanitizer.test.ts core/tests/unit/core-services-smartPaste.test.ts`
  - `npx jest --config jest.config.cjs --selectProjects unit-web --runTestsByPath ui/web/tests/unit/components/noteEditor.test.tsx ui/web/tests/unit/components/noteView.test.tsx`
  - `npx jest --runTestsByPath tests/integration/noteEditorScreen.test.tsx`
  - `npm run type-check`
  - `npm --prefix ui/mobile run type-check`
- Full static checks before completion:
  - `npm run validate`
  - `npm --prefix ui/mobile run validate`

## Manual Testing
**What requires human validation?**

- Web clipboard behavior in a real browser for `text/html` + `text/plain`
- Mobile clipboard behavior on at least one target device/emulator, especially HTML-first writes into non-EverFreeNote destinations
- Round-trip paste quality back into EverFreeNote for:
  - heading blocks
  - lists
  - task lists
  - alignment/font styling
- Feedback visibility and accessibility for success/error states
- Residual gap: no manual smoke verification was completed in this implementation pass.

## Performance Testing
**How do we validate performance?**

- Verify large note copy remains responsive on mobile bridge and web
- Verify large note copy remains responsive on mobile native clipboard path and web
- Confirm no noticeable lag when copying typical note bodies

## Bug Tracking
**How do we manage issues?**

- Label regressions under:
  - `clipboard`
  - `smart-paste`
  - `mobile-webview`
  - `formatting`
