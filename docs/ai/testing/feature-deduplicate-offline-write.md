---
phase: testing
title: Testing — Deduplicate Offline Write Pattern
description: Test plan for executeOfflineWrite extraction
---

# Testing Strategy

## Test Coverage Goals

- 100% of the refactored offline paths in `useNoteSaveHandlers`
- Existing `useNoteSaveHandlers.cy.tsx` tests must continue to pass without modification
- New tests cover offline scenarios (previously not tested)

## Unit Tests — useNoteSaveHandlers (Cypress component)

### executeOfflineWrite path via handleSaveNote

- [ ] offline create: clicking Save with no selectedNote and isOffline → calls `offlineCache.saveNote`, updates overlay, enqueues mutation
- [ ] offline update: clicking Save with selectedNote and isOffline → calls `offlineCache.saveNote` with operation=update
- [ ] offline create sets selectedNote to temp id
- [ ] offline save shows toast ("Saved offline")

### executeOfflineWrite path via handleAutoSave

- [ ] offline autoSave create: triggers offlineCache.saveNote and enqueueMutation
- [ ] offline autoSave update: updates overlay with upsert semantics
- [ ] full queue refresh happens in finally block after autoSave (pendingCount/failedCount reflect queue)

### Existing tests (must not regress)
- [x] handleSaveNote calls insert for new note (online)
- [x] handleSaveNote calls update for existing selected note (online)
- [x] handleSaveNote uses "Untitled" when title is empty
- [x] handleReadNote exits editing mode after save
- [x] confirmDeleteNote closes dialog and clears noteToDelete
- [x] confirmDeleteNote clears selectedNote when deleted note was selected
- [x] handleAutoSave does nothing when user is not logged in
- [x] handleAutoSave skips new note creation when all fields are empty

## Test Data

- `mockSupabase` with `offlineCache` mock (or isOffline=true network condition)
- For offline tests: mount component with `isOffline=true` injected via context or prop

## Test Reporting & Coverage

- Run: `npx cypress run --component --spec "cypress/component/ui/web/hooks/useNoteSaveHandlers.cy.tsx"`
- All 8 existing tests must pass
- New offline tests added in same file

## Status

- [x] Existing tests verified passing (no modifications needed — public API unchanged)
- [x] New offline tests written (3 new tests in `cypress/component/ui/web/hooks/useNoteSaveHandlers.cy.tsx`)
- [ ] All tests passing (requires Cypress run; TypeScript compiles clean)
