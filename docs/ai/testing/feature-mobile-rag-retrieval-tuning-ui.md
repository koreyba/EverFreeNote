---
phase: testing
title: Mobile RAG Retrieval Tuning UI
description: Test strategy for mobile retrieval settings and AI search precision controls
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit coverage for all changed mobile hooks/components
- Integration-style coverage for mobile settings panel and search screen wiring
- Regression coverage for Gemini key flow and existing mobile AI search basics

## Unit Tests
**What individual components need testing?**

### Mobile settings panel
- [x] Test case 1: loads retrieval settings defaults/read-only values
- [x] Test case 2: saves updated `topK`
- [x] Test case 3: renders friendly fallback state when retrieval settings fail to load
- [x] Test case 4: loads indexing settings and saves updated indexing values
- [x] Additional coverage: Gemini key save/remove still works

### Mobile search controls / state
- [x] Test case 1: precision slider reflects persisted threshold
- [x] Test case 2: slider commit persists threshold and triggers one refetch
- [x] Test case 3: `useMobileSearchMode` no longer stores preset state
- [x] Additional coverage: `Notes/Chunks` view mode persistence still works

### Mobile AI search hook
- [x] Test case 1: uses persisted `topK` and threshold instead of `SEARCH_PRESETS`
- [x] Test case 2: handles `hasMore` contract correctly
- [x] Test case 3: keeps results empty for short queries / disabled AI mode
- [x] Additional coverage: preserves note grouping behavior and raw chunk mode

## Integration Tests
**How do we test component interactions?**

- [x] Search screen loads retrieval settings and renders mobile precision UI
- [x] Settings screen and search screen stay consistent for the same saved retrieval values
- [x] Failure path where settings load fails but search/settings still render defaults
- [x] Settings screen shows indexing controls and persists them via the shared indexing service

## End-to-End Tests
**What user flows need validation?**

- [ ] User saves `topK` on mobile settings and mobile AI search uses it on a real device
- [ ] User changes precision in mobile search and sees updated retrieval behavior on a real device
- [x] Regression of existing Gemini key setup flow on mobile

## Test Data
**What data do we use for testing?**

- Mocked `api-keys-status`, `api-keys-upsert`, and `rag-search` responses
- Existing mobile settings/search test fixtures
- AI chunk fixtures with repeated note IDs for grouping coverage

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Mobile-targeted Jest commands for updated hooks/components
- `npm --prefix ui/mobile run validate`
- Record any remaining manual-only gaps after implementation

### Executed Checks
- `npm test -- --runTestsByPath tests/component/useMobileSearchMode.test.tsx tests/component/useMobileAIPaginatedSearch.test.tsx tests/component/searchResultsList.test.tsx tests/unit/settingsPanels.test.tsx tests/integration/searchScreen.test.tsx tests/integration/searchScreenAI.test.tsx`
- `npm test -- --runTestsByPath tests/unit/settingsPanels.test.tsx tests/integration/settingsScreen.test.tsx`
- `npm run validate` in `ui/mobile`

## Manual Testing
**What requires human validation?**

- Mobile search screen layout on narrow widths
- Slider usability on device/touch input
- Light/dark theme rendering for the updated settings/search UI
- Basic smoke test for settings persistence across app restarts

## Performance Testing
**How do we validate performance?**

- Ensure slider dragging remains responsive
- Ensure repeated AI refetch does not happen on every intermediate drag event

## Bug Tracking
**How do we manage issues?**

- Treat regressions in Gemini key flow, mobile AI search trigger logic, and settings persistence as blocking
