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
- `addTags`, `removeTag` — update the draft; tag-only changes do not start autosave
- `handleSave` cancels the pending autosave; `handleRead` flushes it
- `getExportNote`, `handleExportRequest`
- All JSX

## Status

- [x] Implementation complete
- [x] TypeScript compiles
- [x] Tests written

## Flush boundary for edits made during a save

Tag changes intentionally do not start an autosave timer on their own. When a
transition flushes the editor, the hook waits for the active write and then
compares the live draft with the last successfully written snapshot. It repeats
until the latest draft is durable, including a tag added or removed during the
wait. A failed durable write propagates to the transition owner so navigation
can preserve the draft. A note switch, account change, or editor unmount prevents
the old flush from enqueueing another snapshot in a different session.

Manual saves register their snapshot and completion with the editor session.
A transition waits instead of submitting an identical automatic write, while a
newer scheduled body edit can still start. Failed manual writes keep the draft
unconfirmed. If a failure occurs during a transition, that transition fails;
a later transition retries the latest draft, including a forced write when the
draft equals the last confirmed baseline. This matters because the local cache
and sync queue are separate writes. Unmount or a real note switch releases
waiters and prevents the old session from enqueueing follow-up work.
When a newer manual write succeeds, a failed older automatic payload is no
longer retried; any later live edit remains pending. Read also waits for a
manual save when autosave is not configured.

Read keeps the editing surface and mobile toolbar inert until the transition
finishes; it restores editing after an error. When a selected image is still
being read or validated, the editor reports `Adding image...`, disables manual
Save and awaits the operation before taking the transition snapshot. Failed
image processing shows an error and aborts the transition. Unmount cancels the
file read and releases waiters. A native picker that has not yet returned a
file is not tracked as an image operation. A browser operation that never
settles remains visibly pending; releasing the editor without completing or
cancelling the operation would risk silently dropping it.
