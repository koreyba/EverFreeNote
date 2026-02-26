---
phase: implementation
title: Implementation — Extract useNoteEditorAutoSave
description: Technical notes
---

# Implementation Guide

## Files Changed

| File | Action | Lines before → after |
|---|---|---|
| `ui/web/hooks/useNoteEditorAutoSave.ts` | CREATE | 0 → ~120 |
| `ui/web/components/features/notes/NoteEditor.tsx` | UPDATE | 342 → ~185 |

## What Moves to the Hook

From `NoteEditor.tsx`:
- `noteIdRef` + `useEffect` to sync it
- `lastResetNoteIdRef`
- `pendingCreateRef`
- `getAutoSavePayload`
- `debouncedAutoSave` (`useMemo` with `createDebouncedLatest`)
- Note-switching `useEffect` (lines 138–170) — the most complex piece
- `handleContentChange`
- `flushPendingSave` logic (moved out of `useImperativeHandle`)

## What Stays in NoteEditor

- `titleInputRef`, `editorRef` — DOM refs
- `selectedTagsRef`, `selectedTags`, `tagQuery`, `editorSessionKey` (via hook return)
- `showSaving` + its `useEffect`
- `exportDialogOpen`, `exportDialogNote`
- `getFormData` — reads DOM refs, passed as callback to hook
- `addTags`, `removeTag` — call `scheduleAutoSave` from hook
- `handleSave`, `handleRead` — call `cancelAutoSave` from hook
- `getExportNote`, `handleExportRequest`
- All JSX

## Status

- [x] Implementation complete
- [x] TypeScript compiles
- [x] Tests written
