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

## Component Tests

### ui/mobile/components/tags
- [x] TagChip: renders label, onPress, onRemove.
- [x] TagList: empty list, overflow count, onTagPress.

### ui/mobile/components/NoteCard
- [x] NoteCard: title/date, description sanitization, search snippet, tags, onPress.

## Integration Tests

### app/(tabs)/settings.tsx
- [x] Selecting a theme option updates the current mode display.

### app/(tabs)/index.tsx (NotesScreen)
- [x] Swipe-to-delete flow updates list and handles errors.
- [x] Empty state and navigation integration.

### app/note/[id].tsx (NoteEditorScreen)
- [x] Delete button behavior, loading/error states, and header actions.

### hooks/useNotes + hooks/useDeleteNote
- [x] Optimistic delete, cache updates, offline queueing, and error rollback.

### Notes flow (search + fetch)
- [x] Search → fetch flow, tag filtering cache entries, offline fallback, and sync queueing.

## End-to-End Tests
- [ ] Deferred (Detox/Appium planned after unit/integration baseline).

## Test Data
- AsyncStorage mocked via jest async-storage mock.
- Expo modules mocked in `tests/setupTests.ts`.
- No external fixtures yet.
- In-memory offline storage and controllable network status for sync tests.

## Test Reporting & Coverage
- Run from `ui/mobile`: `npm run test:coverage`
- Latest run: `npm test` (pass, 2026-01-08).
- Coverage status: not measured in this change set.
- Known gaps: Search screen UI flows (screen-level coverage pending).
- Jest uses force-exit due to React Native/Expo open handles; use `npx jest --runInBand --detectOpenHandles` for investigation.

## Manual Testing
- N/A for testing foundation changes.

## Performance Testing
- N/A.

## Bug Tracking
- Standard project issue tracking.
