---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement

Notes currently has one selected-note session. Selecting another note replaces the current view, so users lose the working context of the previous note: reading/editing mode, scroll position, editor caret/selection, and any local draft that is still in the autosave pipeline. Users work around this by opening several browser tabs, which duplicates application state and makes navigation/search/tag flows harder to reason about.

The feature serves authenticated EverFreeNote users who work with several notes in one Notes workspace, on desktop and on narrow/mobile layouts.

## Goals & Objectives

- Add an in-app Notes workspace with at least one active tab at all times.
- Make ordinary note selection replace the active tab; only the explicit Add tab action creates a new tab.
- Deduplicate by note ID: selecting an already-open note activates its existing tab.
- Preserve per-tab note snapshot, Reading/Editing mode, local draft, save status, scroll position, and best-effort editor caret/text selection.
- Flush pending autosave work before leaving a tab and surface dirty/saving/error state on the tab.
- Restore the workspace after a page reload in the same browser tab, including order, active tab, note snapshots, drafts, mode, and view state.
- Keep the workspace alive while moving between Notes, Tags, Search, and Settings.
- Provide a desktop tab strip and a compact mobile presentation backed by the same state model.

### Non-goals for the first version

- Split View or displaying two note editors simultaneously.
- Drag-and-drop tab reordering.
- Close-all/close-right/close-others commands.
- Persisting the web workspace after a browser is fully closed; web persistence is scoped to `sessionStorage` and therefore to one external browser tab.
- New backend tables, Supabase endpoints, or a second concurrent editor session for the same note.

## User Stories & Use Cases

- As a note author, I can select a note from the normal list and it opens in the current active tab.
- As a note author, I can explicitly add a tab, then select a note and keep the first note open in its original tab.
- As a note author, I can switch tabs and return to the same Reading/Editing mode, scroll location, draft, and editor context.
- As a note author, I cannot open the same note in two tabs; selecting it activates the existing tab.
- As a note author, I can close any tab. Closing the active tab activates the tab to its right, or the left tab when there is no right neighbor.
- As a note author, closing the final tab leaves one empty active tab instead of removing the workspace.
- As a note author, I see a subtle dirty/saving/error marker and receive confirmation before closing a tab whose save failed.
- As a note author, note selection from the list, search results, tag results, and internal note-opening flows follows the same active-tab rule.
- As a note author, navigating to Tags, Search, or Settings does not destroy the Notes workspace; returning restores it.
- As a mobile user, I can see the active note and open-tab count and use a compact tab list to switch or close tabs.

## Success Criteria

- [ ] The Notes workspace always renders one active tab, including the initial and last-tab-closed states.
- [ ] List/search/tag/internal selection replaces the active tab unless the selected note is already open, in which case its existing tab activates.
- [ ] Add tab creates exactly one blank active tab and does not open a note implicitly.
- [ ] Active-tab close chooses right neighbor first, then left neighbor; closing the last tab creates one blank tab.
- [ ] Switching tabs does not lose a flushed or pending local draft; save failure remains visible and is not silently discarded.
- [ ] Reading and Editing modes are restored per tab; editing restoration includes title/body/tags draft values.
- [ ] Scroll position is restored for Reading and Editing views; caret/selection restoration is best effort and never blocks navigation.
- [ ] A valid `sessionStorage` snapshot restores tab order, active tab, note snapshots, drafts, and view state after reload; malformed or oversized state falls back safely to one blank tab.
- [ ] The tab model is shared by desktop and mobile presentation components.
- [ ] No new network request is required just to switch tabs, and no duplicate note editor session can be created for one note ID.
- [ ] Existing autosave, manual save, delete, search, tag, offline, and settings-return behavior remains passing.

## Constraints & Assumptions

- Existing `useNoteAppController` remains the navigation boundary; wrappers must flush the current editor before switching, closing, or leaving Notes.
- Existing offline cache/queue and `useNoteEditorAutoSave` remain the source of truth for writes. Tabs store a local working snapshot and status; they do not introduce a second persistence protocol.
- Web workspace persistence uses `sessionStorage`, which naturally separates same-origin browser tabs while surviving reloads. Storage access can fail and must be treated as best effort.
- Note content may be large. Serialization is bounded and failure-safe; the application must keep the in-memory workspace usable when storage quota is exceeded.
- Supabase data remains user-scoped. Persisted note snapshots are advisory UI state and are revalidated through existing note-opening logic when a note is selected.
- Editor caret/selection coordinates are ProseMirror-specific and can become invalid after remote content changes; restore only when the editor accepts the coordinates.
- The native mobile app may use its platform persistence adapter, but it must consume the same reducer/model semantics as the web tab strip.

## Questions & Open Items

The following review decisions resolve the v1 ambiguities without changing the requested behavior:

- Desktop Add capacity is responsive: tabs keep a 120px minimum, overflow
  remains scrollable for existing/restored tabs, and Add is disabled when the
  measured viewport cannot accommodate one more minimum-width tab. The shared
  workspace model also enforces a 32-tab ceiling in the core/controller, and
  mobile exposes that same disabled state while its compact list remains
  scrollable.
- Web persistence is explicitly `sessionStorage` per external browser tab. Native mobile persistence is an adapter concern and is not allowed to change the web contract.
- If flushing the active editor fails during a normal switch, the transition is aborted so the user can retry and the failed state remains visible. Closing a failed tab is allowed only after an explicit discard confirmation.
- Caret/text-selection restoration is best effort and may be skipped after remote content reconciliation; draft and scroll restoration remain mandatory.
- The repository's current AI/search “open note in context” callbacks are the internal-open integration point. Any future note-link handler must call the same controller open-note function.
- Conflict-resolution UI is deferred; existing last-write-wins/autosave reconciliation remains authoritative.

## Requirements Review Resolution (2026-08-01)

All template sections are complete. The supplied concept provides the problem, target users, workflows, edge cases, mobile behavior, reload boundary, and explicit non-goals. The five decisions above are implementation defaults for unspecified details; none require additional backend or product clarification before Phase 4.
