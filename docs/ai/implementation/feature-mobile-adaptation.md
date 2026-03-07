---
phase: implementation
title: Implementation Guide - Mobile Adaptation
description: Technical implementation notes, patterns, and code guidelines for mobile adaptation
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Ensure `npx shadcn-ui@latest add sheet` has been run (or check `components/ui/sheet.tsx`).

## Code Structure
**How is the code organized?**

- `components/features/notes/NotesShell.tsx`: Main layout controller. Handles mobile view switching.
- `components/features/notes/Sidebar.tsx`: Adapted for responsive width.
- `components/features/notes/NoteView.tsx`: Added mobile navigation (Back button).

## Implementation Notes
**Key technical details to remember:**

### Responsive Layout Strategy
- Use `hidden md:flex` to toggle between the List view (Sidebar) and the Detail view (Editor) on mobile.
- On Desktop, both are visible side-by-side.
- `Sidebar` takes `w-full` on mobile and `w-80` on desktop.

### Navigation
- Mobile navigation is state-driven (`selectedNote` not null -> show Editor).
- "Back" button clears `selectedNote` to return to the list.

## Integration Points
**How do pieces connect?**

- The `Sidebar` receives props from `useNoteAppController`. These props need to be passed down correctly in both the Desktop (direct) and Mobile (Sheet) instances.

## Error Handling
**How do we handle failures?**

- Standard React error boundaries apply.

## Performance Considerations
**How do we keep it fast?**

- Ensure the Sheet doesn't cause layout thrashing when opening.

## Mobile Editor Toolbar

- The mobile rich-text toolbar now groups advanced formatting into compact menus to keep the horizontal action row usable on phones.
- Heading selection uses a single trigger that opens `H1`/`H2`/`H3` actions.
- Text alignment uses a single trigger that opens `left`/`center`/`right` actions.
- Font size uses a compact size picker with the same point sizes as the web editor.
- Link editing and image insertion are handled through inline URL forms in the toolbar overlay.
- The React Native toolbar sends explicit bridge commands (`toggleHeadingLevel`, `clearFormatting`, `setLinkUrl`, `insertImageUrl`) to the WebView editor so mobile behavior does not depend on ad hoc TipTap chain access.
