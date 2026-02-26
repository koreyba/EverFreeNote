---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

`useNoteAppController.ts` (~720 lines) is a **god-controller hook** that handles every aspect of the notes application in a single file:
- Auth delegation
- Selection & navigation state
- Offline sync & overlay
- Full-text search integration
- Computed note data (overlay-merge, FTS-merge, counts)
- Auto-save logic (create/update, online + offline branches, ~140 lines)
- Manual save logic (create/update, online + offline branches, ~115 lines)
- Single-note delete (online + offline)
- Tag removal
- Bulk selection operations (select-all, bulk-delete online + offline)
- Editor ref registration and pending-flush coordination

**Who is affected?**
- Developers who read, debug, or extend the notes feature. Any change to save or delete logic requires navigating the entire 720-line file.

**Current situation:**
The file works correctly but violates the Single Responsibility Principle. `handleAutoSave` and `handleSaveNote` alone account for ~255 lines of complex business logic (offline/online branching, cache updates, overlay management). They are mixed in the same file as unrelated concerns (computed selectors, FTS merge, bulk selection).

## Goals & Objectives
**What do we want to achieve?**

### Primary Goals
- Extract save/write logic into `useNoteSaveHandlers.ts` (auto-save, manual save, read-mode transition, single delete, tag removal)
- Extract bulk selection actions into `useNoteBulkActions.ts` (bulk delete, selectAllVisible)
- Extract computed/derived data into `useNoteData.ts` (overlay-merge, FTS-merge, notesById, counts)
- Reduce `useNoteAppController.ts` to a pure orchestrator: imports sub-hooks, wires dependencies, returns the unified public API

### Secondary Goals
- Each new hook must be independently testable in isolation
- The public API surface of `useNoteAppController` (return type `NoteAppController`) must remain **100% unchanged** — no callers break

### Non-Goals
- Changing any behaviour or business logic
- Modifying the UI layer
- Splitting `useNoteSync`, `useNoteSearch`, `useNoteSelection`, or `useNoteAuth` (already well-scoped)
- Adding new features

## User Stories & Use Cases
**How will users interact with the solution?**

> The "users" here are developers.

- As a developer debugging an autosave race condition, I want to open **only** `useNoteSaveHandlers.ts` so I can focus on the save logic without scrolling past 400 unrelated lines.
- As a developer adding a new bulk action, I want to open **only** `useNoteBulkActions.ts` so the surface I need to understand is minimal.
- As a developer writing a unit test for the overlay merge, I want to import **only** `useNoteData.ts` and mock its inputs without setting up the entire controller.
- As a reviewer, I want each file's responsibility to be obvious from its name alone.

## Success Criteria
**How will we know when we're done?**

The primary measure of success is **SRP compliance and readability**, not line counts. Each file should have one clear responsibility that is obvious from its name.

- [ ] `useNoteAppController.ts` contains only orchestration wiring (no business logic)
- [ ] `useNoteSaveHandlers.ts` exists and owns all save/write/delete handlers
- [ ] `useNoteBulkActions.ts` exists and owns bulk-delete and selectAllVisible
- [ ] `useNoteData.ts` exists and owns overlay-merge, FTS-merge, notesById, counts
- [ ] `NoteAppController` return type is identical to pre-refactor (verified by TypeScript)
- [ ] No regressions in manual testing (save, autosave, offline, bulk delete, FTS)

> Line counts (e.g. "≤150 lines") are rough indicators, not hard requirements.

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical Constraints
- Must not change the `NoteAppController` return type — all consumers (`NotesShell`, etc.) use it directly
- Sub-hooks receive their dependencies as parameters (no new React context introduced)
- State that is shared between sub-hooks (e.g. `offlineOverlay`, `setSelectedNote`) stays in `useNoteSync` / `useNoteSelection` and is passed down

### Assumptions
- The existing `useNoteSync`, `useNoteSelection`, `useNoteSearch`, `useNoteAuth` hooks are already well-scoped and will not be restructured
- `handleAutoSave` and `handleSaveNote` have identical offline/online branching; any diffing/deduplication is a separate cleanup task (out of scope)

## Questions & Open Items
**What do we still need to clarify?**

All architectural placement questions resolved (2026-02-26):

- [x] `confirmDeleteNote` → `useNoteSaveHandlers` (same offline write pattern as save handlers)
- [x] Nav wrappers (`wrappedHandleSelectNote`, `wrappedHandleCreateNote`, `wrappedHandleSearchResultClick`, `handleTagClick`) → stay in orchestrator (glue code bridging editor-flush + selection + sync)
- [x] `noteEditorRef` / `registerNoteEditorRef` / `flushPendingEditorSave` → stay in orchestrator (cross-cutting coordination)
