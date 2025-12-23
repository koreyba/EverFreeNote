---
phase: testing
title: Mobile Testing Foundation
description: Baseline unit/component/integration testing setup for the React Native app
---

# Testing Strategy: Mobile Testing Foundation

## Test Coverage Goals
- Unit tests for core utilities and pure logic.
- Component tests for key reusable UI components.
- Integration tests for screen-level behavior.
- End-to-end tests deferred to a later phase.

## Unit Tests

### core/utils/search.ts
- [x] buildTsQuery: empty/short input, long input, single word, multi-word sanitization.
- [x] detectLanguage: empty input, cyrillic, latin.
- [x] ftsLanguage: ru/en/uk mapping.

## Integration Tests

### app/(tabs)/settings.tsx
- [x] Selecting a theme option updates the current mode display.

## End-to-End Tests
- [ ] Deferred (Detox/Appium planned after unit/integration baseline).

## Test Data
- AsyncStorage mocked via jest async-storage mock.
- Expo modules mocked in `tests/setupTests.ts`.
- No external fixtures yet.

## Test Reporting & Coverage
- Run from `ui/mobile`: `npm run test:coverage`
- Latest run: `npm test` (pass, 2025-12-23).
- Coverage status: not measured in this change set.
- Known gaps: Notes list screen, search screen, TagList/TagChip, NoteCard.

## Manual Testing
- N/A for testing foundation changes.

## Performance Testing
- N/A.

## Bug Tracking
- Standard project issue tracking.
