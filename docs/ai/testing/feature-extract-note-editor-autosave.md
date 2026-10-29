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

## Edits during a transition flush (2026-10-29)

- Before the fix, a held local write followed by a pane switch and a tag edit
  allowed navigation while the durable queue still contained the old tags; an
  inactive tab could then close without warning and lose the edit on reopen.
- `DesktopSplitView.cy.tsx` covers add/remove and rapid tag edits, reverting to
  the original tags, local-write failure and retry, an online mocked PATCH,
  and a mocked server error retained in the queue. The offline test remounts a
  fresh workspace after clearing sessionStorage and reads the cached note.
- Read locks the editor during its save, including the mobile toolbar. Tests
  cover a competing pane activation, save failure and keyboard editing on retry.
- Image tests hold file reading across Read and pane activation, including an
  image started during a pending save, file/decode errors, pending body autosave,
  tag-only draft, beforeunload warning and unmount cancellation. The file picker
  itself is not tracked until it returns a file.
- `ManualSaveOverlap.cy.tsx` covers manual/automatic completion order, newer
  text and tags, save failure, retry after reverting, account changes, unmount,
  note ID assignment and Read without autosave. Split-view tests cover duplicate
  local writes offline and mocked online PATCHes, plus a queue failure after the
  cache has already changed and its subsequent recovery.
- `ManualAutoFailureRace.cy.tsx` checks failures before and after manual
  success, ensuring older payloads are not retried while later text, tags and
  deliberate reverts remain saveable.
- On the manual-save overlap fix, 157/157 focused component cases and 44/44
  editor and debouncer unit cases passed with retries disabled. Online results
  use mocked server responses; offline cases exercise the local IndexedDB queue.
- The final 198-case component run had one broken toolbar test caused by a
  Cypress subject-chain error; the other 197 passed. After correcting that test,
  the complete 40-case split suite passed (the other 158 cases had already
  passed). Both runs used coverage and zero retries. The editor/session unit
  suites passed 27/27. These are synthetic component and mocked-network tests,
  not a physical-device or deployed-server test.

## Status

- [x] Existing tests verified
- [x] New tests written
- [x] TypeScript clean
