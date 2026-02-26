---
phase: implementation
title: Implementation — Split RichTextEditor
description: Technical notes for the three-file split
---

# Implementation Guide

## Files Changed

| File | Action | Lines before → after |
|---|---|---|
| `ui/web/components/editorExtensions.ts` | CREATE | 0 → 50 |
| `ui/web/components/EditorMenuBar.tsx` | CREATE | 0 → 514 |
| `ui/web/components/RichTextEditor.tsx` | UPDATE | 764 → 208 |
| `ui/web/components/RichTextEditorWebView.tsx` | UPDATE | 242 → 194 |

## Code Structure

### editorExtensions.ts

- Single named export: `editorExtensions`
- All TipTap extension imports move here from both editor files

### EditorMenuBar.tsx

Exports:
- `HistoryState` (type)
- `EditorMenuBar` (component, previously named `MenuBar`)

Moves from `RichTextEditor.tsx`:
- All lucide icon imports
- `Popover`, `PopoverContent`, `PopoverTrigger` imports
- `TwitterPicker`, `ColorResult` imports
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` imports
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` imports
- `fontFamilies`, `fontSizes` constants
- `MenuBarProps` type → renamed to `EditorMenuBarProps`
- `addImage` helper (was inline function inside MenuBar)
- The entire `MenuBar` JSX

### RichTextEditor.tsx

Removes:
- All moved imports (lucide icons, popover, select, tooltip, twitter picker)
- `fontFamilies`, `fontSizes`
- `MenuBarProps` type
- `MenuBar` function (lines 104–562)
- `editorExtensions` `useMemo` block

Adds:
- `import { EditorMenuBar, type HistoryState } from "./EditorMenuBar"`
- `import { editorExtensions } from "./editorExtensions"`

Keeps:
- `EMPTY_HISTORY_STATE`, `areHistoryStatesEqual`, `getHistoryState` (used in editor callbacks)
- All editor lifecycle logic

### RichTextEditorWebView.tsx

Removes:
- All TipTap extension imports (move to editorExtensions.ts)
- `editorExtensions` `useMemo` block

Adds:
- `import { editorExtensions } from "./editorExtensions"`

## Status

- [x] Implementation complete
- [x] TypeScript compiles (npx tsc --noEmit: no errors)
- [ ] Tests pass (requires Cypress run)
