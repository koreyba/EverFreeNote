---
phase: requirements
title: Tag Management Page Requirements
description: Requirements and specifications for the dedicated Tag Management page on web and reusable tag core logic.
---

# Requirements & Problem Understanding

## Problem Statement
Currently, tags in EverFreeNote exist within individual notes or as inline tag filters, but there is no centralized interface to manage, rename, cleanup, or view statistics on tags. Users need a dedicated Tag Management page to browse all tags alphabetically, see how many notes use each tag, rename tags across all notes, and delete tags when no longer needed.

Furthermore, business logic for tag statistics, tag renaming, and tag deletion must be decoupled from web UI and placed in the `@core` module so it can be reused by the mobile React Native application in the future.

## Goals & Objectives

### Primary Goals
1. **Core Logic Extraction (`@core`)**: Extract reusable functions into `core/services/tags.ts` for:
   - Aggregating unique tags with note usage counts (`TagWithCount`).
   - Sorting tags alphabetically supporting both English (Latin) and Russian (Cyrillic) alphabets (`Intl.Collator` / `localeCompare`).
   - Grouping tags into dynamic Alphabetical Grid groups (`A-Z`, `А-Я`, `#`).
   - Bulk renaming a tag across all user notes.
   - Bulk deleting a tag from all user notes.
2. **Dedicated Tag Management View (Web)**:
   - Display all tags in alphabetical order with a dynamic, multilingual Alphabetical Grid (Latin A-Z & Cyrillic А-Я Quick Jump Index).
   - Show note count next to each tag, e.g. `javascript (15)`, `заметки (8)`.
   - Clicking a tag filters notes by that tag and navigates to notes view.
   - "Three dots" context menu next to each tag with options: **Rename** and **Delete**.
3. **Responsive Web Navigation & Access**:
   - Introduce a Primary Navigation Rail (Desktop) / Bottom Nav Bar (Mobile) while strictly preserving the existing sidebar search and bottom settings button.
4. **Desktop & Mobile UI/UX**:
   - Desktop: Sleek, high-density grid or list with sticky alphabetical quick jump index.
   - Mobile: Touch-friendly cards, mobile bottom sheet/dialogs for actions, smooth alphabetical quick jump index bar.

### Non-Goals
- Nested tag hierarchies (sub-tags) - tags remain flat string tags.
- Tag color customization (deferred to future feature).

## User Stories & Use Cases

1. **View All Tags Alphabetically (Multilingual EN/RU)**:
   - *As a user*, I want to open the Tags page and see my tags sorted alphabetically whether they are written in English (`A-Z`) or Russian (`А-Я`), with letter jump buttons dynamically showing available initial letters so I can find tags instantly.

2. **Tag Usage Statistics**:
   - *As a user*, I want to see `Tag Name (Count)` so I know which tags are heavily used and which are obsolete.

3. **Filter Notes by Tag**:
   - *As a user*, when I click on a tag, I want to immediately see all notes tagged with it.

4. **Rename Tag Across Notes**:
   - *As a user*, I want to rename `js` to `javascript` (or `конспект` to `учеба`) via the tag context menu so that all notes using that tag are updated automatically.

5. **Delete Tag Across Notes**:
   - *As a user*, I want to delete an unused or redundant tag so that it is removed from all notes using it.

6. **Preserve Current Layout Capabilities**:
   - *As a user*, I want to keep using the existing sidebar search button and bottom settings icon in Notes view, while enjoying the new navigation panel to switch to Tags.

7. **Cross-Platform Readiness**:
   - *As a developer*, I want all tag computation and mutation logic in `core/` so the mobile app can re-use it without duplication.

## Success Criteria
- 100% test coverage for `@core` tag management service including EN and RU tag sorting/grouping.
- All notes updating in memory and persistent storage upon tag rename or delete.
- Existing search button and settings panel stay 100% functional and intact in the Notes sidebar.
- Seamless navigation between Notes and Tag Management page on both desktop and mobile resolutions.
- Accessible, keyboard-friendly UI with ARIA attributes and clean responsive layouts.

## Navigation & Access Architecture (Aligned with User)
- **Desktop**: Collapsible Primary Navigation Rail (Left Dock).
  - Switches between main views (`Notes` vs `Tags`).
  - Preserves existing Search panel trigger and Settings dialog trigger.
  - Keeps the existing Notes Sidebar fully functional (Search trigger at top, Settings button at bottom remain in place).
- **Mobile**: Bottom Navigation Bar with tabs (`Notes`, `Tags`, `Search`, `Settings`).

## Questions & Open Items
- Confirm preferred desktop sidebar layout (Collapsible Primary Rail vs. Accordion Section inside Sidebar).
