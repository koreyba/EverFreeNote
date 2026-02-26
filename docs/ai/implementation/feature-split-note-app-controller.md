---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- No new dependencies required
- All new files live in `ui/web/hooks/`
- Run `tsc --noEmit` after each phase to catch type errors early
- Run existing tests after each phase: see project test command

## Code Structure
**How is the code organized?**

```
ui/web/hooks/
  useNoteAppController.ts   ← reduced to orchestrator (≤150 lines)
  useNoteData.ts            ← NEW: computed/derived note data
  useNoteSaveHandlers.ts    ← NEW: all write handlers
  useNoteBulkActions.ts     ← NEW: bulk delete + selectAllVisible
  useNoteAuth.ts            (unchanged)
  useNoteSearch.ts          (unchanged)
  useNoteSelection.ts       (unchanged)
  useNoteSync.ts            (unchanged)
```

## Implementation Notes

### Core Features

#### `useNoteData` — computed data hook
Move these items verbatim from `useNoteAppController.ts`:
- `notes` (`useMemo` over `applyNoteOverlay`)
- `notesById` (`useMemo` over `new Map(...)`)
- `resolveSearchResult` (`useCallback` over `pickLatestNote + mergeNoteFields`)
- `mergedFtsData` (`useMemo` aggregating FTS results)
- `totalNotes` (`useMemo` from `notesQuery.data?.pages`)
- `notesDisplayed`, `notesTotal`, `selectedCount` (derived from above)
- `notesRef` (`useRef` + `useEffect` to sync)

**Returns** `notesRef` so the orchestrator can pass it to `useNoteSaveHandlers`.

#### `useNoteSaveHandlers` — write operations hook
Move these items verbatim from `useNoteAppController.ts`:
- `saving`, `autoSaving` state
- `handleAutoSave` (full implementation, ~140 lines)
- `handleSaveNote` (full implementation, ~115 lines)
- `handleReadNote` (calls handleSaveNote)
- `confirmDeleteNote` (single-note delete, online + offline)
- `handleRemoveTagFromNote` (tag removal)

**Key parameters to receive from orchestrator:**
- `notesRef` — read-only ref to avoid stale closure in `handleAutoSave`
- `selectedNoteRef` — read-only ref to avoid stale closure in `handleAutoSave`
- All setters from `useNoteSync` and `useNoteSelection`

#### `useNoteBulkActions` — bulk operations hook
Move these items verbatim from `useNoteAppController.ts`:
- `deleteSelectedNotes` (bulk delete, online + offline)
- `selectAllVisible` (thin wrapper over `selectAllVisibleCallback`)

### Patterns & Best Practices

- **Mechanical move first:** Copy the code verbatim into the new hook, confirm it compiles, then delete from `useNoteAppController.ts`. Avoid combining move + refactor in one step.
- **Keep `useCallback` deps complete:** After moving, ensure all deps arrays are correct — moving a function to a different scope can expose missing deps that TypeScript/ESLint catches.
- **No new memoisation layers:** Don't add extra `useMemo` or `useCallback` wrappers — the existing ones are sufficient. Keep the extracted code faithful to the original.
- **Type the params object:** Define each hook's params as a named `type UseXxxParams = { ... }` in the same file, above the hook.

## Integration Points
**How do pieces connect?**

The orchestrator wires everything together in this order:

```
1. useNoteAuth()
2. useNoteSelection()
3. [mutations: useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag]
4. useNoteSync({ user, createNoteMutation, ... })
5. useNoteSearch(user?.id)
6. useNotesQuery({ ... })
7. useNoteData({ notesQuery, offlineOverlay, aggregatedFtsData, selectedNoteIds, showFTSResults })
8. [notesRef, selectedNoteRef — defined here, populated by useEffect]
9. useNoteSaveHandlers({ user, isOffline, offlineCache, enqueueMutation, ..., notesRef, selectedNoteRef })
10. useNoteBulkActions({ selectedNoteIds, isOffline, ..., notes, mergedFtsData })
11. [nav wrappers: wrappedHandleSelectNote, etc. — defined here]
12. return { ...all public API }
```

## Error Handling
**How do we handle failures?**

- All existing error handling (`try/catch`, `toast.error`, `console.error`) stays exactly where it is — the move is verbatim.
- No new error boundaries or fallbacks are introduced.

## Performance Considerations
**How do we keep it fast?**

- All `useMemo` and `useCallback` dependencies remain identical to today — no performance change.
- TypeScript `ReturnType<typeof useNoteAppController>` is verified to be unchanged, so consumers are unaffected.

## Security Notes
**What security measures are in place?**

- No changes to auth, input validation, or data handling — purely structural.
- The `handleAutoSave` early-return guard (`if (!user) return`) stays in `useNoteSaveHandlers`.
