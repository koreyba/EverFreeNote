---
phase: requirements
title: Modern Editor and Main Window Redesign
description: Clarify the problem space, gather requirements, and define success criteria for a modern, elegant web note editor and main window layout.
---

# Requirements & Problem Understanding

## Problem Statement
The current web interface of EverFreeNote has a functional layout but lacks a modern, elegant, and highly polished aesthetic. In web design, a premium look and feel, excellent ergonomics, and smooth transitions are crucial for user retention and satisfaction. Additionally, the user experience (UX) and ergonomics—especially on mobile devices—need refinement to feel native, fluid, and delightful.

Specifically, we want to address:
- **Aesthetic quality**: Moving away from standard borders and plain structures to elevated card patterns, modern typography, glassmorphism, and balanced color palettes.
- **Ergonomics & UX**: Enhancing touch targets, note card interaction, navigation, list readability, and providing a distraction-free writing experience.
- **Responsive design**: Seamless layout scaling from wide desktop monitors to mobile phone displays.
- **Dark/Light modes**: Beautifully tuned colors for both modes, ensuring optimal contrast and eye comfort.

## Goals & Objectives
- **Primary Goals**:
  - Redesign the Main Window structure (sidebar, note list, and main panel) to feel premium and contemporary.
  - Redesign the Note View (reading mode) for a clean, distraction-free, and legible reading experience.
  - Redesign the Note Editor (editing mode) with refined toolbar design, input spacing, and helper indicators.
  - Ensure perfect responsive adaptation (sidebar/editor toggle on mobile, layout scaling on desktop).
  - Update layout-related dependencies (e.g., `lucide-react` icons and Radix/Tailwind configurations if needed) to ensure modern icon aesthetics.
  - Support both Light and Dark modes with curated, high-quality colors.
- **Secondary Goals**:
  - Polish the search panel (`SearchResultsPanel.tsx`) and general navigation elements (e.g. tag selectors, settings buttons) to match the new styles.
- **Non-Goals**:
  - Re-implementing backend logic, sync engines, databases, or API protocols.
  - Creating a brand new settings page (though any shared style updates will apply to the settings page automatically, we won't explicitly redesign its internal custom settings forms unless needed).

## User Stories & Use Cases
- **As a note taker (desktop & mobile)**:
  - I want a clean, legible sidebar that shows my notes, so I can scan titles and tags instantly.
  - I want a beautiful, wide reading pane that lets me focus on reading my notes with comfortable typography.
  - I want to toggle into editing mode and have a distraction-free environment where toolbar buttons are clearly organized and text areas are easy to interact with.
  - I want a layout that adapts seamlessly to my mobile screen, hiding the sidebar when I'm reading/editing a note, with a clear and ergonomic back-navigation action.
  - I want the color scheme (light/dark) to look professional, polished, and reduce eye strain.

## Success Criteria
- **Visual Design**: UI looks modern, clean, and professional (comparable to premium note apps like Notion, Bear, or Craft). Uses rich typography, refined borders, and gentle transitions.
- **Responsive Web Design**: Passes mobile usability checks (proper touch target sizes of at least 44x44px, no horizontal overflows, readable text sizes).
- **Usability/Accessibility**: Correct keyboard navigation support, high contrast ratios, and clear interactive feedback.
- **Performance**: Redesign does not introduce lag in virtualization or editor typing speed.

## Constraints & Assumptions
- Must remain compatible with Tailwind v4.0 (as used in the project).
- Must use existing icons from `lucide-react` (updated to the latest version).
- Must work within Next.js App Router structure.

## Questions & Open Items
- **Q**: Are there specific icon changes or design kits requested?
  - *Decision*: We will update `lucide-react` to its latest version and leverage the latest modern icon pack, using clean, thin-stroke variants if available.

## October 2026 follow-up acceptance
- Show the complete long title on phone and desktop without horizontal clipping.
- Keep a note with twelve tags visually compact; expose every tag and all existing operations through an accessible disclosure.
- Make editing and reading look like the same document, with flat action chrome and a continuous editable canvas.
- Preserve saving, autosave, tab selection/session restoration, find, mobile keyboard and safe-area behavior.

## Image accessibility follow-up
- Expose the note body as a named multiline textbox and allow descriptions to be edited for any image using touch or keyboard.
- Preserve existing content and image attributes; identify images with no description in the interface without silently rewriting them. Mark an image decorative only by an explicit user choice.

## Image size consistency
- Keep safe image width and height across reading, editing, clipboard, MCP and ENEX export/import. Existing note content must not be rewritten by viewing it.
- Limit images to the available mobile width and preserve their intended aspect ratio when both dimensions are present.

## October 29 focus and tag correction
Remove the decorative green editor focus line; preserve caret, real blockquotes and control focus indicators. Restore the tag appearance from before the document redesign. Show as many complete tags as the available row can hold, reserving space for disclosure and Add. Recalculate on resize and font loading. Add opens/closes only the input; disclosure independently expands/collapses the full collection. Preserve filtering, removal and keyboard entry without horizontal scrolling.
