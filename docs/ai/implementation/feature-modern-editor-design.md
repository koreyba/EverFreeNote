---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines for redesigning the web editor and main window.
---

# Implementation Guide

## Development Setup
1. **Prerequisites**: Ensure the current branch is `feature-modern-editor-design` and that all dependencies are installed.
2. **Commands**:
   - `npm install lucide-react@latest` to get the latest icons.
   - `npm run dev` to start the Next.js dev server.

## Code Structure & Files to Modify
- **Styles**:
  - `app/globals.css`: Define design tokens (colors, variables, standard shadows) and note body typography.
- **Shell & Navigation**:
  - `ui/web/components/features/notes/Sidebar.tsx`: Sidebar layout, logo alignment, sync badges, search button trigger, and profile row.
- **Note Lists & Cards**:
  - `ui/web/components/features/notes/NoteCard.tsx`: Visual structure of compact and search note cards.
  - `ui/web/components/features/notes/NoteList.tsx` / `ui/web/components/features/notes/EmptyState.tsx`: Containers, lists, and empty states.
- **Reading & Writing**:
  - `ui/web/components/features/notes/NoteView.tsx`: Reading mode layout.
  - `ui/web/components/features/notes/NoteEditor.tsx`: Editor workspace.
  - `ui/web/components/RichTextEditor.tsx` / `ui/web/components/EditorMenuBar.tsx`: Rich text editor toolbar and workspace styling.

## Implementation Details & UI Enhancements

### Theme Variables (`app/globals.css`)
We will use modern oklch curves:
- Light background: `oklch(98.5% 0.002 240)` for a very soft blue-grey tint instead of stark white.
- Light card background: `oklch(100% 0 0)` for elevated cards.
- Border colors: `oklch(93% 0.003 240)` for thinner, less obtrusive borders.
- Hover accents: Softer tints of emerald (`oklch(96% 0.02 145)`) and dark mode equivalent (`oklch(28% 0.04 145)`).

### Component Enhancements
- **Pill Search Button**: Instead of a simple input replica, the sidebar search trigger should be styled as a clean button with rounded borders and a soft hover transition.
- **Note Cards**: Add a thin active indicator on selection (e.g. left vertical accent line or soft shadow inset) and use rounded corners.
- **Distraction-free Reading/Writing**: Add a centered layout with `max-w-3xl px-4` to standard reading panes.
- **Floating/Unified Toolbar**: Style Tiptap toolbar buttons with smaller icons and rounded tool buttons.

## Error Handling & Verification
- Ensure that updating `lucide-react` does not break any existing icons in settings or elsewhere.
- Run type-checks: `npm run type-check` and `npm run type-check:tests`.
- Run tests: `npm run test:unit:web` to verify layout components don't crash under standard test cases.
