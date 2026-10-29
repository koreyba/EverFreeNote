---
phase: testing
title: Testing — Extract useNoteEditorAutoSave
description: Test plan
---

# Testing Strategy

## Existing Tests (must not regress)

Existing NoteEditor Cypress scenarios must continue to pass; history shortcuts use the native key for the test platform.

## New Tests for useNoteEditorAutoSave (via NoteEditor harness)

- [x] autosave fires after content change (debounced) — `debounces autosave` in NoteEditor.cy.tsx
- [x] autosave is cancelled on manual Save — `cancels pending autosave when Save is clicked` in NoteEditor.cy.tsx
- [x] note switch resets editorSessionKey (triggers remount) — `resets editor undo/redo history when switching` in NoteEditor.cy.tsx
- [x] undefined→id transition during autosave-create does NOT reset editorSessionKey — `does not interrupt typing when autosave updates props` + race condition suite in NoteEditor.cy.tsx
- [x] flushPendingSave triggers immediate save — `NoteEditorSaveExit.cy.tsx` (all 3 tests)

## Content Preservation

- `NoteEditorNoopNormalization.cy.tsx` exercises unchanged plain text and HTML, empty notes, title/tag-only edits, real text and formatting changes, undo/redo, external updates, and multiline text across reopening.
- `useNoteSaveHandlers.test.tsx` checks no-op Read, normalized legacy tags, in-flight and failed writes, and preserving the original body on manual title changes.
- `cypress/qa/features/notes/NoteEditorNoopDatabase.cy.tsx` exercises the real local Supabase write path with an isolated synthetic account: no PATCH or timestamp change on no-op exit/Read, plus a multiline edit and reopen. Run this only against an isolated local instance with `QA_API_URL`, `QA_ANON_KEY`, and `QA_SERVICE_KEY` supplied to Cypress.
- Stored bodies do not identify their format. A plain string containing HTML-shaped tags or entities is ambiguous and retains the existing HTML interpretation; no-op editing still preserves its original bytes.

## Status

- [x] Existing tests verified
- [x] New tests written
- [x] TypeScript clean
