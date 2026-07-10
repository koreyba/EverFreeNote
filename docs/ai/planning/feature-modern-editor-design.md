---
phase: planning
title: Project Planning & Task Breakdown
description: Actionable plan and breakdown of tasks to redesign the editor and main window.
---

# Project Planning & Task Breakdown

## Milestones
- [ ] Milestone 1: Foundations and Dependency Updates (Update `lucide-react` & CSS token palette)
- [ ] Milestone 2: Navigation & Note Cards Redesign (Refactor Sidebar, Search trigger, and NoteCard UI)
- [ ] Milestone 3: Content Editing & View Redesign (Refactor NoteView, NoteEditor, and RichTextEditor)
- [ ] Milestone 4: Responsive Verification & Polish (Light/Dark auditing, mobile optimizations)

## Task Breakdown

### Phase 1: Foundations
- [ ] Task 1.1: Update `lucide-react` to the latest version to ensure modern icons.
- [ ] Task 1.2: Refine design tokens in `app/globals.css` (refine oklch colors for backgrounds, cards, primary emeralds, and text; establish soft shadows and transitions).

### Phase 2: Navigation & List Redesign
- [ ] Task 2.1: Redesign `Sidebar.tsx` (cleaner header, pill-shaped search button, minimalist sync indicator, modern user profile component).
- [ ] Task 2.2: Redesign `NoteCard.tsx` (compact list item cards, search results card styling, tags, and transition on select/hover).

### Phase 3: Note Reader & Writer Redesign
- [ ] Task 3.1: Redesign `NoteView.tsx` (add maximum readable width, elegant title, clean horizontal tags flow, elegant headers and details).
- [ ] Task 3.2: Redesign `NoteEditor.tsx` and `EditorMenuBar.tsx` / `RichTextEditor.tsx` (clean borderless inputs, refined editor toolbar buttons, tags editing suggestions panel).

### Phase 4: Integration, Responsiveness & Polish
- [ ] Task 4.1: Perform responsive checks for mobile layout (collapsing sidebar, back buttons, touch targets) and desktop layout.
- [ ] Task 4.2: Check Light and Dark modes to ensure beautiful rendering, correct contrast ratios, and no styling glitches.
- [ ] Task 4.3: Run existing unit and component tests and ensure no regressions.

## Timeline & Estimates
- **Milestone 1**: ~0.5 hours
- **Milestone 2**: ~1.5 hours
- **Milestone 3**: ~2 hours
- **Milestone 4**: ~1 hour
- **Total estimated time**: ~5 hours
