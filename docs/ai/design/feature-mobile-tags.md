---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- Mermaid diagram:
  ```mermaid
  graph TD
    MobileUI[Mobile Screens] --> TagUI[Tag UI Components]
    TagUI --> Core[Core note/tag services]
    Core --> Data[(Existing storage)]
  ```
- Mobile UI renders tags and uses core services/hooks for data.
- Tag operations reuse existing note update flows and core tag logic.
- No new backend services or APIs.
- Tapping a tag navigates to the search screen with a single active tag filter.

## Data Models
**What data do we need to manage?**

- Use existing core models (no schema changes).
- Note entity contains tags as an array of strings (match web behavior).
- Tag values follow the same normalization rules as web (trim/case/dedup).

## API Design
**How do components communicate?**

- No new endpoints.
- Mobile UI calls existing core services/hooks to read/update notes with tags.
- Tag filtering uses the same query/filter mechanism as web (core-owned).
- Navigation passes a `tag` filter parameter to the search screen; the search screen is the single source of truth for filtering UI.

## Component Breakdown
**What are the major building blocks?**

- Mobile screens: note list, note detail/editor, search.
- UI components:
  - TagChip (tappable pill/chip)
  - TagList (read-only display)
  - TagInput (add/remove tags)
  - TagFilterBar (active filter and clear action on search screen)
- Data hooks/services: reuse existing note/tag logic from core and mobile hooks.

## Design Decisions
**Why did we choose this approach?**

- Keep core as the single source of truth for tag behavior.
- Minimize risk by limiting changes to UI/mobile layer.
- Align UX with web while keeping mobile-friendly controls.
- Prefer additive UI components to avoid large refactors.
- Single-tag filter to match current mobile web behavior; selecting a new tag replaces the active filter.
- Tag taps route users into search with the filter applied to keep navigation consistent.

## Non-Functional Requirements
**How should the system perform?**

- Tag rendering should not degrade list scroll performance.
- Filtering must update results quickly without blocking UI.
- Maintain existing caching and offline behavior.
- Ensure touch targets and contrast meet accessibility needs.
