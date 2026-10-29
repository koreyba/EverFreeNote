---
phase: design
title: Design — Extract useNoteEditorAutoSave
description: Hook boundary and API design
---

# System Design & Architecture

## Architecture Overview

```mermaid
graph TD
    A[NoteEditor.tsx] -->|params + callbacks| B[useNoteEditorAutoSave]
    B -->|editorSessionKey, handlers| A
    A -->|getFormData callback| B
    A -->|onNoteSwitch callback| B
    B --> C[createDebouncedLatest]
    B --> D[noteIdRef / pendingCreateRef]
```

## Hook API

### Parameters

```typescript
type UseNoteEditorAutoSaveParams = {
  noteId?: string
  initialTitle: string
  initialDescription: string
  initialTags: string
  autosaveDelayMs: number
  onAutoSave?: (data: NoteAutoSavePayload) => Promise<void> | void
  getFormData: () => { title: string; description: string; tags: string }
  cancelDebouncedTagQuery: () => void   // hook calls this on note switch
  onNoteSwitch?: () => void              // NoteEditor resets tag/query state here
}
```

### Returns

```typescript
type UseNoteEditorAutoSaveResult = {
  editorSessionKey: number               // key prop for editor/input remount
  handleContentChange: () => void        // onChange for title input + editor
  scheduleAutoSave: (overrides?: Partial<NoteAutoSavePayload>) => void  // explicit save scheduling
  cancelAutoSave: () => void             // for manual Save
  flushPendingSave: () => Promise<void>  // for useImperativeHandle
}
```

### Internals (not exposed)

- `noteIdRef` — kept in sync with `noteId` prop
- `lastResetNoteIdRef` — tracks last note id that triggered a session reset
- `pendingCreateRef` — marks in-flight autosave creates; `scheduleAutoSave` sets it automatically

## Design Decisions

| Decision | Rationale |
|---|---|
| `getFormData` passed as callback | DOM refs (`titleInputRef`, `editorRef`) live in NoteEditor; hook reads current values via callback |
| `onNoteSwitch` callback | Hook detects the switch; NoteEditor owns its own tag/query state reset |
| `scheduleAutoSave` hides `pendingCreateRef` | Callers scheduling a save don't need to know about the pending-create pattern; tag-only edits still wait for Save or a transition |
| `buildTagString(parseTagString(initialTags))` in debouncedAutoSave.reset | Normalizes tags on note switch, same as original behavior |
| Keep the original body while its parsed editor document is unchanged | Opening or closing an editor must not rewrite plain text or equivalent HTML just because the editor serializes it differently. A real text or formatting change is saved as HTML. |
| Recheck the live draft after an awaited transition flush | Tag edits made while an earlier durable write is in flight do not schedule their own timer. Navigation must include those edits and wait for their write; a session change stops the old flush from enqueueing into a different editor. |
| Wait for already selected image files before a transition | File reading and image validation must complete before the final save snapshot. A failed file operation aborts the transition; an unmounted editor cancels its operation. The operating-system file picker itself is outside this boundary until it returns a file. |
| Lock editing during Read | The body, tags and mobile formatting toolbar remain non-interactive while Read awaits its final save; a visible status explains the delay and an error restores editing. Concurrent pane navigation has a separate editor-lifetime guard. |
| Interpret only unambiguous plain text as literal text | The stored body has no format flag. Text containing HTML-shaped tags or entities keeps its existing HTML interpretation; adding a format flag would be needed to disambiguate it. |
