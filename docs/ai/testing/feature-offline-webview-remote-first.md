---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

Feature: offline-webview-remote-first

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% of new/changed code
- Integration test scope: EditorWebView source selection + fallback + dev badge
- End-to-end test scenarios: online/offline editor load for dev/stage/prod
- Alignment with requirements/design acceptance criteria

## Unit Tests
**What individual components need testing?**

### Source Selection Helper
- [x] Test case 1: Online -> remote selected (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Test case 2: Offline -> local selected (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Test case 3: Missing local/remote -> error UI (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)

### Fallback Handling
- [x] Test case 1: Remote load error triggers one-time fallback to local (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Test case 2: Subsequent errors do not loop back to remote (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Additional coverage: HTTP error -> fallback reason `http-error` (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Additional coverage: READY timeout -> fallback reason `ready-timeout` (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)

### Dev Badge
- [x] Test case 1: Badge renders only for dev variant (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Test case 2: Popup shows source + reason (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)
- [x] Additional coverage: Tap toggles popup visibility (`ui/mobile/tests/component/editorWebViewSource.test.tsx`)

### Local Bundle Helpers
- [x] Platform-specific bundle URL selection (`ui/mobile/tests/unit/localBundle.test.ts`)

## Integration Tests
**How do we test component interactions?**

- [ ] Integration scenario 1: EditorWebView loads remote when online
- [ ] Integration scenario 2: EditorWebView falls back to local on error
- [ ] Integration scenario 3: Offline start loads local bundle
- [ ] Integration scenario 4: Connectivity drops before READY -> fallback to local

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: Open note online, editor loads remote
- [ ] User flow 2: Turn off network, open note, editor loads local
- [ ] User flow 3: Start online, lose network, open another note -> loads local
- [ ] Critical path testing: edit text and ensure message bridge works
- [ ] Regression of adjacent features: editor toolbar actions

## Test Data
**What data do we use for testing?**

- Simple HTML fixtures for note content
- Mock NetInfo connectivity states
- Mock WebView error events

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Coverage commands and thresholds: `cd ui/mobile && npm run test -- --coverage`
- Coverage gaps: record any files below 100% with rationale
- Manual testing outcomes and sign-off
- Latest run: `cd ui/mobile && npm run test` (pass, warns about EditorWebView console output and force-exit due to open handles)

## Manual Testing
**What requires human validation?**

- Dev badge appears and shows correct source info
- Online/offline transitions trigger the correct source
- Active editor is not reloaded after READY when connectivity drops
- WebView editor remains interactive after fallback

## Performance Testing
**How do we validate performance?**

- Measure local load time on mid-range Android device
- Verify fallback occurs within ~1s after error

## Bug Tracking
**How do we manage issues?**

- Track bugs in the project issue system
- Tag issues with variant (dev/stage/prod) and source (remote/local)
