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

## October 2026 follow-up
Starting from the separate canvas-fill fix a75c218. Scope: NoteEditor, NoteView, TagInput and shared document styles. Search title guards must accept textarea; existing title-specific test selectors migrate without changing behavior assertions. No persistence schema, native keyboard, navigation or backend contract changes.


Implemented:
- Shared document width/gutters/title CSS in globals.css; 24px narrow-phone, 28px phone and 36px desktop titles.
- NoteEditor uses an uncontrolled autosizing textarea, retaining the existing save/autosave/session source of truth. Resizes on input, external accepted snapshots, width changes and font readiness. Existing text is preserved; Enter is blocked and newly pasted CR/LF characters are stripped with native undo support.
- NoteFindBar and findInNote recognize textarea titles alongside input titles.
- NoteTag supplies accessible filter/remove buttons; TagInput and NoteView share its appearance. Long collections show three tags plus a disclosure, with all tags accessible when expanded. Add tag expands and focuses its input. Reader disclosure resets when opening another note; editor disclosure follows its editing-session key.
- Flat action buttons and a single primary Save/Edit button. Existing mobile toolbar, full-height canvas, safe-area and keyboard geometry are retained.
- Title selectors in existing tests now target the field independently of the input/textarea element type. The old horizontal-tag-scroll scenario now verifies the replacement disclosure workflow. The image scrolling fixture uses 667px height because the compact document already fits its image at 844px.

No changes to persistence schemas, backend requests, EditorMenuBar or EditorToolbarButton. No production deployment or native device verification in this change.
