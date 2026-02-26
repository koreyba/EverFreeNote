---
phase: requirements
title: Extract useNoteEditorAutoSave from NoteEditor
description: Isolate the autosave + note-switch logic from NoteEditor into a dedicated hook
---

# Requirements & Problem Understanding

## Problem Statement

`NoteEditor.tsx` (342 lines) mixes two distinct concerns:

1. **UI/form rendering** — title input, tag input, RichTextEditor, Save/Read buttons, export dialog
2. **Autosave & note-switch logic** — `pendingCreateRef`, `debouncedAutoSave`, note-switching `useEffect`, `flushPendingSave`

The autosave logic is particularly complex: it uses `pendingCreateRef` to distinguish "autosave just created a note and assigned a server ID" from "user navigated to a different note" — a subtle edge case. This logic currently sits alongside JSX, increasing cognitive load when working on either concern.

## Goals & Objectives

**Primary goals:**
- Extract `useNoteEditorAutoSave` hook: owns `pendingCreateRef`, `noteIdRef`, `editorSessionKey`, note-switching `useEffect`, `debouncedAutoSave`, `handleContentChange`, `scheduleAutoSave`, `cancelAutoSave`, `flushPendingSave`
- Reduce `NoteEditor.tsx` from 342 to ~180 lines
- New hook: ~120 lines, independently testable

**Non-goals:**
- No behavioral changes — identical runtime behavior
- No changes to `NoteEditorHandle`, `NoteEditorProps` — callers unchanged
- No new features

## Success Criteria

- `useNoteEditorAutoSave.ts` encapsulates all autosave/note-switch logic
- `NoteEditor.tsx` calls the hook and uses its returned API
- `npx tsc --noEmit` passes clean
- Existing Cypress tests for NoteEditor behavior pass without modification

## Constraints & Assumptions

- Hook file: `ui/web/hooks/useNoteEditorAutoSave.ts`
- `getFormData` is passed as a callback parameter (reads DOM refs that live in NoteEditor)
- `onNoteSwitch` callback: called by the hook when a real note switch happens, so NoteEditor can reset its tag/query state
- `scheduleAutoSave(overrides?)` internally handles the `pendingCreateRef` pattern — callers don't need to know about it
