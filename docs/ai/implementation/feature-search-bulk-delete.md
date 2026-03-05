---
phase: implementation
title: Implementation Guide (Search Bulk Delete)
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup

No new dependencies or environment changes are required.

## Code Structure

Primary files:
- `ui/web/hooks/useNoteBulkActions.ts`
- `ui/web/hooks/useNoteAppController.ts`
- `ui/web/hooks/useNoteSearch.ts`
- `ui/web/hooks/useAIPaginatedSearch.ts`
- `ui/web/hooks/useLongPress.ts`
- `ui/web/hooks/useBulkDeleteConfirm.ts`
- `ui/web/components/features/notes/SearchResultsPanel.tsx`
- `ui/web/components/features/notes/SelectionModeActions.tsx`
- `ui/web/components/features/notes/BulkDeleteDialog.tsx`
- `ui/web/components/features/search/AiSearchToggle.tsx`
- `ui/web/components/features/search/AiSearchViewTabs.tsx`
- `ui/web/components/features/search/NoteSearchResults.tsx`
- `ui/web/components/features/search/NoteSearchItem.tsx`
- `ui/web/components/features/notes/NoteCard.tsx`

## Implementation Notes

### Shared delete helper

`useNoteBulkActions` owns `deleteNotesByIds(ids)` and returns a structured result:

```ts
type DeleteNotesByIdsResult = {
  total: number
  failed: number
  queuedOffline: boolean
}
```

Flow:
1. Validate `ids`.
2. Offline path: queue delete mutations and update offline overlay.
3. Online path: `Promise.allSettled` over `deleteNoteMutation.mutateAsync`.
4. Invalidate both query families:
   - `['notes']`
   - `['aiSearch']`
5. Clear selected note reference.

`deleteSelectedNotes` (sidebar path) is a thin wrapper around this helper and exits sidebar selection mode after completion.

### Search panel selection flow

`SearchResultsPanel` owns panel-local state:

```ts
panelSelectionMode
panelSelectedIds
panelBulkDeleting
```

Behavior:
- Enter selection mode by selecting a card (checkbox or long press).
- Use shared `SelectionModeActions` for `Select all`, `Delete (N)`, `Cancel`.
- Deletion is confirm-first via `useBulkDeleteConfirm` + `BulkDeleteDialog`.
- After confirmed delete:
  - AI Notes view -> `resetAIResults()`
  - FTS or tag-only view -> `resetFtsResults()`
- Exit panel selection mode only when `failed === 0`.
- Auto-exit selection mode if selected count reaches `0`.

### Tag and query behavior

`useNoteSearch` supports three explicit scenarios:
- query only
- tag only
- query + tag

Tag-only path uses `useNotesQuery({ searchQuery: '', selectedTag })` and exposes pagination helpers for `NoteList`.

### AI pagination behavior

`useAIPaginatedSearch` mirrors FTS accumulation:
- offset-based growth of requested `topK`
- accumulated `noteGroups`
- `aiHasMore`, `aiLoadingMore`
- `resetAIResults`, `loadMoreAI`

`useNoteAppController` exposes bridge callbacks via `registerAIPaginationControls`.

### Cross-device blocked-switch hint

When panel selection mode is active:
- `AiSearchToggle` and `AiSearchViewTabs` are disabled.
- Hint text is `Remove selection to switch`.
- Desktop: tooltip on hover.
- Mobile: tooltip on tap toggle + outside tap close.

## Patterns & Best Practices

- Keep sidebar selection state and panel selection state independent.
- Reuse `SelectionModeActions` and `BulkDeleteDialog` across surfaces.
- Keep panel open after delete and rely on cache invalidation + reset callbacks.
- Preserve tag filter context after delete.

## Integration Points

- Controller API consumed by `NotesShell` and `SearchResultsPanel`.
- `NoteList` handles both regular and FTS list rendering with selection props.
- `NoteSearchResults` handles AI Notes list with selection + pagination props.

## Error Handling

- Partial delete failures keep panel selection state for retry.
- Shared toast patterns for success and failures are used in the helper.
- `panelBulkDeleting` and `bulkDeleting` prevent repeated submissions.

## Performance Considerations

- Delete requests remain batched.
- Query invalidation is key-based, not item-based.
- FTS/AI resets force clean first-page repopulation after delete.

## Security Notes

- No new auth surface.
- Deletion still goes through existing authenticated mutations.
