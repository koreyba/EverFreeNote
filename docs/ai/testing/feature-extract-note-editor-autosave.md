---
phase: testing
title: Testing — Extract useNoteEditorAutoSave
description: Test plan
---

# Testing Strategy

## Existing Tests (must not regress)

Check for existing NoteEditor Cypress tests — all must pass unchanged.

## New Tests for useNoteEditorAutoSave (via NoteEditor harness)

- [x] autosave fires after content change (debounced) — `debounces autosave` in NoteEditor.cy.tsx
- [x] autosave is cancelled on manual Save — `cancels pending autosave when Save is clicked` in NoteEditor.cy.tsx
- [x] note switch resets editorSessionKey (triggers remount) — `resets editor undo/redo history when switching` in NoteEditor.cy.tsx
- [x] undefined→id transition during autosave-create does NOT reset editorSessionKey — `does not interrupt typing when autosave updates props` + race condition suite in NoteEditor.cy.tsx
- [x] flushPendingSave triggers immediate save — `NoteEditorSaveExit.cy.tsx` (all 3 tests)

## Status

- [x] Existing tests verified
- [x] New tests written
- [x] TypeScript clean
