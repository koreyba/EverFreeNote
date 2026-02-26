---
phase: requirements
title: Split RichTextEditor into focused components
description: Extract EditorMenuBar and editorExtensions from RichTextEditor.tsx to apply SRP
---

# Requirements & Problem Understanding

## Problem Statement

`ui/web/components/RichTextEditor.tsx` (764 lines) contains two separate concerns in one file:

1. **`MenuBar`** — a ~250-line presentational component with 25+ toolbar buttons, selects, and a color picker. It receives `editor` as a prop and has no hooks or side effects of its own.
2. **Editor logic** — `useEditor`, `useImperativeHandle`, paste handling, caret placement, history state management.

Additionally, the TipTap extension configuration array is **copy-pasted verbatim** in both `RichTextEditor.tsx` (lines 574–602) and `RichTextEditorWebView.tsx` (lines 54–85). Any change to extensions must be applied twice.

- **Who is affected**: developers working on toolbar behavior, editor behavior, or extension configuration
- **Current workaround**: none — changes to toolbar require navigating 764 lines; sync of extensions is manual

## Goals & Objectives

**Primary goals:**
- Extract `MenuBar` → `EditorMenuBar.tsx` (pure presentation component)
- Extract shared extensions array → `editorExtensions.ts` (module-level const, no duplication)
- Reduce `RichTextEditor.tsx` from 764 to ~200 lines, containing only editor lifecycle logic

**Non-goals:**
- No behavioral changes to any component
- No changes to the public API (`RichTextEditorHandle`, `RichTextEditorProps`) — callers unchanged
- No new features
- `RichTextEditorWebView.tsx` only changes to import `editorExtensions` — no other modifications

## User Stories & Use Cases

- As a developer, I want to find and modify toolbar buttons in a single focused file
- As a developer, I want to update TipTap extensions in one place and have both editors benefit

## Success Criteria

- `EditorMenuBar.tsx` exists and contains all toolbar JSX; `RichTextEditor.tsx` imports it
- `editorExtensions.ts` exports the shared extensions const; both editors import it
- `RichTextEditor.tsx` is ≤220 lines
- `npx tsc --noEmit` passes with no errors
- All existing Cypress tests pass without modification

## Constraints & Assumptions

- New files in the same directory: `ui/web/components/`
- `HistoryState` type is defined in `EditorMenuBar.tsx` and imported by `RichTextEditor.tsx`
- `editorExtensions` is a module-level `const` (not `useMemo`) — TipTap extension instances are safe to share
- `EMPTY_HISTORY_STATE`, `areHistoryStatesEqual`, `getHistoryState` stay in `RichTextEditor.tsx`
