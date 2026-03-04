---
phase: implementation
title: Implementation Guide (Search Results Panel)
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Validate docs scaffold and feature docs:
  - `npx ai-devkit@latest lint`
  - `npx ai-devkit@latest lint --feature search-results-panel`
- Validate code quality gates:
  - `npm run type-check`
  - `npm run eslint`

## Code Structure
**How is the code organized?**

- `ui/web/hooks/useNoteSearch.ts`
  - Owns `isSearchPanelOpen`, query state, and FTS aggregation/pagination.
- `ui/web/hooks/useNoteAppController.ts`
  - Exposes search-panel state and search handlers to the UI.
- `ui/web/components/features/notes/NotesShell.tsx`
  - Inserts `SearchResultsPanel` between `Sidebar` and editor pane.
  - Applies mobile pane visibility rules.
- `ui/web/components/features/notes/Sidebar.tsx`
  - Uses a search trigger (no inline search input).
- `ui/web/components/features/notes/SearchResultsPanel.tsx`
  - Hosts search input, AI search controls/results, FTS results list, close/back controls, and resize behavior.
- `ui/web/components/features/notes/NoteList.tsx`
  - Supports both regular and FTS list modes with optional FTS props.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Search panel open state is controlled centrally through controller/hook state (`isSearchPanelOpen`).
- Sidebar search area is a trigger-only UI surface and opens the dedicated search panel.
- `SearchResultsPanel` supports:
  - Debounced regular search typing.
  - AI mode with presets and tabs.
  - Mobile back button (`md:hidden`) and desktop close button (`md:inline-flex`).
  - Width persistence in `localStorage` (`search-panel-width`) with min/max constraints.
  - Desktop-only drag resize handle.
- Clearing search in the panel resets query state and closes panel.

### Patterns & Best Practices
- Keep regular note-list and FTS/search-result rendering separated by `showFTSResults`.
- Avoid effect-driven synchronous state copies where not required (lint rule: `react-hooks/set-state-in-effect`).
- Keep mobile behavior class-driven in shell composition instead of duplicating screens.

## Integration Points
**How do pieces connect?**

- `NotesShell` passes `controller` into `Sidebar` and `SearchResultsPanel`.
- `SearchResultsPanel` delegates result click through controller handlers (`handleSearchResultClick`, `handleSelectNote`).
- RAG "open in context" remains connected through `onOpenInContext` callback from `NotesShell`.

## Error Handling
**How do we handle failures?**

- AI search error path displays retry action in panel (`aiRefetch`).
- FTS loading/error states are rendered by `NoteList` and `useNoteSearch` query state.

## Performance Considerations
**How do we keep it fast?**

- Regular and search lists stay virtualized in `NoteList`.
- Debounced search typing prevents request floods.
- FTS results are deduplicated and appended incrementally for paged loads.

## Security Notes
**What security measures are in place?**

- Feature is UI/state only; no new auth model or secret handling introduced.
- Existing Supabase auth boundaries are unchanged.
