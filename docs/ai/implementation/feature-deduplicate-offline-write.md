---
phase: implementation
title: Implementation — Deduplicate Offline Write Pattern
description: Technical notes for extracting executeOfflineWrite
---

# Implementation Guide

## Code Structure

All changes are confined to `ui/web/hooks/useNoteSaveHandlers.ts`.

New items:
- `OfflineWriteInput` type (top of file)
- `executeOfflineWrite` async closure (inside `useNoteSaveHandlers`, before `handleAutoSave`)

Removed:
- `offlineMutation` closure inside `handleSaveNote`
- Inline `offlineCache.saveNote` + `setOfflineOverlay` + `enqueueMutation` blocks in `handleAutoSave`

## Implementation Notes

### OfflineWriteInput type

```typescript
type OfflineWriteInput = {
  operation: 'create' | 'update'
  noteId: string
  payload: {
    title?: string
    description?: string
    tags?: string[]
    userId?: string
  }
  baseNote?: NoteViewModel | null
  clientUpdatedAt: string
}
```

### executeOfflineWrite skeleton

```typescript
const executeOfflineWrite = async ({
  operation,
  noteId,
  payload,
  clientUpdatedAt,
}: OfflineWriteInput): Promise<CachedNote> => {
  const cached: CachedNote = {
    id: noteId,
    title: payload.title ?? 'Untitled',
    description: payload.description,
    tags: payload.tags,
    updatedAt: clientUpdatedAt,
    status: 'pending',
  }
  await offlineCache.saveNote(cached)
  setOfflineOverlay((prev) => {
    const idx = prev.findIndex((n) => n.id === noteId)
    if (idx >= 0) {
      const next = [...prev]
      next[idx] = { ...next[idx], ...cached }
      return next
    }
    return [...prev, cached]
  })
  await enqueueMutation({ noteId, operation, payload, clientUpdatedAt })
  setPendingCount((prev) => prev + 1)
  return cached
}
```

### handleAutoSave offline create (after refactor)

```typescript
if (isOffline) {
  const cached = await executeOfflineWrite({
    operation: 'create',
    noteId: tempId,
    payload: noteData,
    clientUpdatedAt,
  })
  setSelectedNote({ id: tempId, ...noteData } as NoteViewModel)
}
```

### handleAutoSave offline update (after refactor)

```typescript
if (isOffline) {
  // optimistic selectedNote update first (UX)
  setSelectedNote((prev) => { ... })
  await executeOfflineWrite({
    operation: 'update',
    noteId: targetId,
    payload: partialPayload,
    clientUpdatedAt,
  })
}
```

Note: `handleAutoSave`'s `finally` block retains the full queue scan for accurate counts.

### handleSaveNote offline branches (after refactor)

```typescript
if (selectedNote) {
  if (isOffline) {
    await executeOfflineWrite({ operation: 'update', noteId: selectedNote.id, payload: noteData, clientUpdatedAt })
    setSelectedNote({ ...selectedNote, ...noteData })
    toast.success('Saved offline (will sync when online)')
    setLastSavedAt(clientUpdatedAt)
  } else { ... }
} else {
  const tempId = uuidv4()
  if (isOffline) {
    await executeOfflineWrite({ operation: 'create', noteId: tempId, payload: { ...noteData, userId: user.id }, clientUpdatedAt })
    setSelectedNote({ id: tempId, ...noteData } as NoteViewModel)
    toast.success('Saved offline (will sync when online)')
    setLastSavedAt(clientUpdatedAt)
  } else { ... }
}
```

## Error Handling

No changes to error handling strategy — both `handleAutoSave` and `handleSaveNote` retain their try/finally blocks. `executeOfflineWrite` lets errors propagate naturally.

## Status

- [x] Implementation complete (340 lines, down from 416)
- [x] TypeScript compiles (npx tsc --noEmit: no errors)
- [ ] Tests pass (requires Cypress run)
