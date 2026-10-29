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
- The React Native toolbar uses explicit bridge commands for `toggleHeadingLevel`, `clearFormatting`, `setLinkUrl`, and `insertImageUrl`; other actions still fall through the generic TipTap chain command lookup in the WebView editor.

## Continuous note editing canvas — 2026-10-28

- The note scroller and rich-text containers form a flex column; the ProseMirror surface fills the remaining space and grows with content. The former fixed 400 px minimum and nested card styling no longer restrict the canvas.
- Desktop keeps the sticky formatting row; mobile keeps the toolbar portal and existing visual viewport, navigation, and safe-area handling. Keyboard focus has a visible accent in both themes.

## Mobile web usability — 2026-10-28

- `Sidebar` uses a compact phone header, exposes Select, and keeps the desktop search and account footer at desktop widths. Sign-out remains in Settings.
- `NotesShell` hides the note pane through `hideNotePane` before mobile navigation, retaining its tab and stopping on a failed save. The mobile navigation highlights Search when its panel is visible.
- The mobile tab switcher displays the active note title only while its pane is visible; elsewhere it shows a compact neutral label while keeping saved tabs accessible.
- Explicit Settings navigation discards the Settings return snapshot; mobile workspace hydration respects a requested Notes or Search destination. The Settings Back action still restores the saved context.
- Settings waits for both authentication sources before redirecting and scrolls the selected mobile tab into view on load and resize.
- A tag chosen from the mobile tag browser clears the old query and explicitly opens its results, including when the same tag is selected again.
- `NoteCard` consumes the compatibility click after a long press, including on the title. `useLongPress` preserves that signal through the selection-mode rerender and resets it on the next gesture.
- Phone note actions use 44×44 px targets; desktop action sizes remain unchanged.
- `SwipeableNoteRow` reveals the existing single-note delete confirmation after a left swipe. A list allows one open swipe action; vertical gestures and selection mode do not reveal it.
- `NoteFindBar` searches title and body in reading and editing views, including matches across inline formatting. The expanded editor exposes Find in its toolbar and searches the visible body. It uses browser text highlights with a non-mutating overlay fallback, and refreshes matches when the draft changes.
- The notes sidebar switches between a list and a two-column grid, remembers the choice locally, and shows a count when a tile has additional tags. Grid rows remain virtualized and use the existing note actions.
