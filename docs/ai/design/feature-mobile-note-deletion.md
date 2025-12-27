---
phase: design
title: System Design & Architecture - Mobile Note Deletion
description: Design for swipe-to-delete in list and delete action in editor.
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- List View: Extend `NoteList` items with swipeable functionality.
- Editor View: Add a "Delete" button to the editor toolbar or header.
- Logic: Reuse `NoteService` from `@core` for remote deletion and `databaseService` for local deletion.

## Data Models
**What data do we need to manage?**

- No schema changes needed. Deletion is a standard operation on the `notes` entity.

## API Design
**How do components communicate?**

- `NoteService.deleteNote(id)`: Standard API call.
- `databaseService.deleteNote(id)`: Standard local SQLite operation.
- UI will trigger confirmation via `Alert.alert` (standard React Native) or a custom Modal.

## Component Breakdown
**What are the major building blocks?**

- `SwipeableNoteItem`: A wrapper for `NoteItem` that adds swipe gestures.
- `DeleteConfirmation`: A utility or hook to trigger the confirmation dialog.
- `EditorToolbar`: Update to include a delete icon.

## Design Decisions
**Why did we choose this approach?**

- Swipe-to-delete: Best mobile standard for list management.
- Implicit Confirmation: The two-step process in the list (Swipe then Tap) acts as a physical confirmation, reducing the need for an additional dialog.
- Delete only on explicit tap of the "Delete" button (after swipe): Prevents accidental deletions from aggressive swiping.
- Editor deletion: Direct action for power users.

## Non-Functional Requirements
**How should the system perform?**

- UI Responsiveness: Swipe animation must be smooth (60fps).
- Data Integrity: Ensure local and remote deletions are eventualy consistent.
