---
phase: design
title: System Design & Architecture
description: Define the design details, component architecture, and styling systems for the modern editor and main screen.
---

# System Design & Architecture

## Architecture Overview
The redesign focuses entirely on the frontend layout, typography, components, and CSS design system. It updates style definitions in Tailwind CSS v4 and refreshes UI structures in Next.js pages and components.

The layout consists of the main `NotesShell` which coordinates the display of `Sidebar` (including `NoteList` and `NoteCard`), the search results panel, and the `EditorPane` (containing `NoteEditor` and `NoteView`).

```mermaid
graph TD
    NotesShell[NotesShell Component] --> Sidebar[Sidebar]
    NotesShell --> SearchPanel[SearchResultsPanel]
    NotesShell --> EditorPane[EditorPane]
    
    Sidebar --> BrandLogo[BrandLogo]
    Sidebar --> SyncStatus[SyncStatus]
    Sidebar --> SearchButton[Search Button]
    Sidebar --> NewNoteButton[New Note Button]
    Sidebar --> NoteList[NoteList Virtualized]
    
    NoteList --> NoteCard[NoteCard Compact]
    SearchPanel --> NoteCardSearch[NoteCard Search]
    
    EditorPane --> EmptyState[EmptyState]
    EditorPane --> NoteEditor[NoteEditor Tiptap]
    EditorPane --> NoteView[NoteView Preview]
```

### Component Responsibilities:
1. **Sidebar**: Handles main navigation, search opening, settings triggering, creation of new notes, and layout wrapper for `NoteList`.
2. **NoteList**: Virtualized container displaying `NoteCard` elements.
3. **NoteCard**: Individual compact or search card representing a note.
4. **NoteView**: Displays the title, tags, and rendered content of a note in a clean, legible reading interface.
5. **NoteEditor**: Houses the interactive title inputs, tags editor, and Tiptap rich-text editor menu and workspace.

## Design Decisions & Aesthetic System
To achieve a premium, modern, and elegant feel, we will implement the following design decisions:

### 1. Typography & Grid System
- **Font Family**: Standardizing on **Inter** (imported via Google Fonts) for clean UI labels.
- **Readable Content Width**: Restrict the note content area to a max width of `3xl` or `4xl` (`max-w-3xl` / `max-w-4xl`) and center it. This prevents lines from being too long, which increases reading fatigue.
- **Margins & Spacing**: Increase whitespace in both reader and editor modes. Premium design relies on breathing room.

### 2. Styling Tokens (`app/globals.css`)
We will refine our color palette to use premium oklch coordinates:
- Softer, more modern background shades:
  - Light background: Soft off-white / light slate (`oklch(99% 0.003 256)`).
  - Dark background: Sleek charcoal-slate (`oklch(18% 0.015 256)`).
- Cards:
  - Light card: Pure white with extremely subtle shadows (`oklch(100% 0 0) shadow-sm`).
  - Dark card: Softer slate with elevated borders (`oklch(22% 0.012 256)`).
- Primary accents: Keep the Emerald theme but make it slightly more vibrant and adjusted for contrast in dark mode.
- Interactive elements: Smooth Transitions (`transition-all duration-200 ease-in-out`), hover scales (`hover:scale-[1.01]`), and clean active states.

### 3. Component Refinement
- **Sidebar**:
  - Turn the search button into a beautiful, pill-shaped trigger with transition states.
  - Simplify sync status into a small indicator light next to the app logo.
  - User profile area at the bottom: cleaner alignment, rounded avatar.
- **Note Cards**:
  - Remove harsh borders. Use a soft background color change for selection.
  - Modernize tags: rounded pills with very low opacity backgrounds matching the theme.
- **Note View / Editor**:
  - Redesign the toolbar: compact, floating style or beautifully segmented buttons.
  - Seamless inputs: note title input should have no borders, only changing focus styles gently.

## Responsive Adaptation
- **Mobile Touch Targets**: Make sure all buttons, toggles, and note card clickable surfaces have a minimum size of 44x44px.
- **Layout Toggling**: Use Tailwind classes (`hidden md:flex`) to show/hide the sidebar and editor panels contextually depending on whether a note is being viewed or edited.

## October 2026: continuous note document
The editor and reader share a centered 52rem document, 20px phone / 32px desktop gutters, a wrapping 28px / 36px title (24px below 360px), and the existing shared body typography. The document has no nested field card. Action buttons are flat with a single primary Save/Edit action; touch targets stay 44px. Formatting remains docked to the bottom on phones and sticky above the body on desktop.

A native textarea grows to show the complete title. Its value and selection remain the source for save, autosave and workspace sessions; search accepts both text input types. Enter does not insert a newline, matching the previous title field. Existing title text is never trimmed or rewritten by layout. Multi-line clipboard inserts lose only their CR/LF characters, matching the former text input. Native insertText preserves undo; setRangeText is a fallback when that editing command is unavailable.

Tag collections initially show three tags plus an explicit remaining count. Expanding reveals every tag with wrapping, removal and addition; collapsing affects presentation only. Reader and editor use matching metadata styling. This supersedes the earlier floating-card/horizontal-only tag treatment. Keyboard focus is visible and disclosure controls announce expanded state.

## Image accessibility
Image options expose a scrollable, safe-area-aware dialog with an ordered image selector, preview, description and explicit decorative choice. Missing descriptions get a display-only fallback in the editor and sanitized reading views; stored and copied HTML remains unchanged. An explicit empty alt denotes a decorative image, while a missing alt remains unknown. The dialog refuses to apply captured positions if the note changes while it is open.

## Image dimensions
Only image width and height consisting of positive integer pixels up to 16,384 are retained by the render, clipboard and MCP sanitizers. Reading and editor DOM use temporary presentation styles so both saved dimensions determine the displayed aspect ratio, while maximum width remains responsive. A height-only image uses containment when constrained. These styles are not written back to the note. ENEX stores display dimensions on each `en-media`; resource dimensions still describe the underlying file. Supported base64 image data is embedded locally and never sent to the optional proxy.
