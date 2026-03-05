---
phase: implementation
title: Implementation Guide (Search Bulk Delete)
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup

No new dependencies or environment changes required.

## Code Structure

Files to change:
- `ui/web/hooks/useNoteAppController.ts` — expose `deleteNotesByIds`
- `ui/web/hooks/useNoteBulkActions.ts` — delegate to `deleteNotesByIds`
- `ui/web/hooks/useNoteSearch.ts` — expose `resetFtsResults` callback
- `ui/web/components/features/notes/SearchResultsPanel.tsx` — add local selection state + UI

## Implementation Notes

### Core Features

**`deleteNotesByIds(ids: string[])`**
Extract from `useNoteBulkActions.deleteSelectedNotes`. Signature:
```ts
deleteNotesByIds: (ids: string[]) => Promise<void>
```
Responsibilities: offline check → batch enqueue or `Promise.allSettled` delete → toast → `queryClient.invalidateQueries({ queryKey: ['notes'] })` → `setSelectedNote(null)`.
The existing `deleteSelectedNotes` becomes a thin wrapper: `await deleteNotesByIds(Array.from(selectedNoteIds))` + `exitSelectionMode()`.

**`resetFtsResults()` in `useNoteSearch`**
```ts
const resetFtsResults = useCallback(() => {
    setFtsOffset(0)
    setFtsAccumulatedResults([])
    lastProcessedDataRef.current = ''
}, [])
```
Called after panel bulk delete succeeds to ensure the FTS refetch produces a clean first page without the deleted notes appearing in stale accumulated state.

**Panel local selection state**
```ts
const [panelSelectionMode, setPanelSelectionMode] = useState(false)
const [panelSelectedIds, setPanelSelectedIds] = useState<Set<string>>(new Set())
const [panelBulkDeleting, setPanelBulkDeleting] = useState(false)

const togglePanelSelection = (id: string) => {
    setPanelSelectedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
}

const exitPanelSelectionMode = () => {
    setPanelSelectionMode(false)
    setPanelSelectedIds(new Set())
}

const handlePanelBulkDelete = async () => {
    if (!panelSelectedIds.size) return
    setPanelBulkDeleting(true)
    try {
        await controller.deleteNotesByIds(Array.from(panelSelectedIds))
        exitPanelSelectionMode()
        controller.resetFtsResults()   // clears accumulated, triggers clean refetch
    } finally {
        setPanelBulkDeleting(false)
    }
}
```

### Patterns & Best Practices

- Do **not** reuse `useNoteSelection` state for the panel. The two selection contexts are independent by design.
- Selection mode toggle button should only be visible when `showFTSResults` is true (not during AI search, not during loading).
- "Delete (N)" button should be visually destructive (red/destructive variant) and show a spinner while `panelBulkDeleting` is true.
- Keep the panel open after deletion — let the refetch update results. Do not close or navigate away.

## Integration Points

- `SearchResultsPanel` receives `controller: NoteAppController` — all new controller methods come through this existing prop.
- `NoteList` FTS path already accepts `selectionMode`, `selectedIds`, `onToggleSelect` — no changes needed in `NoteList`.
- Cache invalidation in `deleteNotesByIds` covers both `useNotesQuery` and `useSearchNotes` via the `['notes']` prefix.

## Error Handling

- Use the same `toast.error` / `toast.success` pattern as existing bulk delete.
- On failure, keep selection mode active so user can retry.
- `panelBulkDeleting` spinner prevents double-submit.

## Performance Considerations

- No additional queries. Invalidation triggers one refetch per active query — same as existing behaviour.
- `resetFtsResults` resets to page 1; re-fetching page 1 is a single DB request.

## Security Notes

- No new auth surface. Deletion goes through the existing `deleteNoteMutation` which is scoped to the authenticated user's notes.
