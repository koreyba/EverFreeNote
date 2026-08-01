---
phase: design
title: Tag Management Page & Core Architecture
description: System design, component architecture, data models, and navigation layout for Tag Management.
---

# System Design & Architecture

## Architecture Overview

The Tag Management feature spans the core logic layer (`@core`) and the web presentation layer (`ui/web`). The core service handles all tag aggregation, initial sorting, grouping, renaming, and deletion. The web UI renders a responsive Tag Management view with alphabetical jump navigation, count badges, and action menus.

```mermaid
graph TD
    subgraph Web UI Layer (ui/web)
        NavRail["Navigation Bar / Rail (Desktop & Mobile)"]
        TagsPage["TagsPage / TagManagementView"]
        AlphabetIndex["Alphabetical Grid / Index Bar"]
        TagCard["Tag Card / Row with Count & Menu"]
        ActionModal["Rename / Delete Dialogs"]
    end

    subgraph Core Shared Layer (core)
        TagService["TagService (core/services/tags.ts)"]
        NoteTypes["Note & Tag Types (core/types/tags.ts)"]
    end

    subgraph State & Storage
        NoteController["useNoteAppController / Notes Store"]
        DB["IndexedDB / Offline Queue / Supabase"]
    end

    NavRail -->|Switch to Tags View| TagsPage
    TagsPage --> TagService
    TagService -->|Compute Tag Counts & A-Z Groups| NoteController
    TagCard -->|Rename / Delete Action| ActionModal
    ActionModal -->|Invoke renameTag / deleteTag| NoteController
    NoteController -->|Call tag helpers| TagService
    TagService -->|Return updated Notes Array| NoteController
    NoteController -->|Persist Changes| DB
```

## Core Service Interface (`core/services/tags.ts`)

```typescript
export interface TagWithCount {
  name: string
  count: number
}

export interface AlphabeticalTagGroup {
  letter: string // 'A'-'Z', 'А'-'Я', or '#' for non-alphabetic
  tags: TagWithCount[]
}

/**
 * Extracts unique tags from a list of notes with usage count, sorted alphabetically (EN + RU support).
 */
export function getTagsWithCounts(
  notes: Array<{ tags?: string[] }>,
  locale?: string
): TagWithCount[]

/**
 * Groups tags alphabetically for an Alphabetical Grid / Index layout (supports Latin & Cyrillic).
 */
export function groupTagsAlphabetically(
  tags: TagWithCount[],
  locale?: string
): AlphabeticalTagGroup[]

/**
 * Renames a tag in all given notes.
 */
export function renameTagInNotes<T extends { tags?: string[] }>(
  notes: T[],
  oldTag: string,
  newTag: string
): T[]

/**
 * Deletes a tag from all given notes.
 */
export function deleteTagFromNotes<T extends { tags?: string[] }>(
  notes: T[],
  targetTag: string
): T[]

/**
 * Removes invalid, empty, whitespace-only, and duplicate tags from notes.
 */
export function cleanUnusedOrEmptyTagsInNotes<T extends { tags?: string[] }>(
  notes: T[]
): T[]
```

## Component Breakdown (`ui/web`)

1. **`NavRail` / `NavigationLayout`**:
   - Primary Navigation Bar (Desktop left rail / Mobile bottom bar).
   - Icons: Notes (`Notes`), Tags (`Tags`), Search (triggers existing SearchPanel), Settings (triggers existing SettingsPanel).
   - Expandable / Collapsible on desktop.
   - **Crucial**: Existing `Sidebar.tsx` remains intact, preserving top search bar and bottom settings button.

2. **`TagsPage`**:
   - Container component receiving notes list and navigation handlers.
   - Header with Tag search/filter input + total tag count.
   - Alphabetical quick jump bar (Dynamic EN/RU letters grid: `A-Z`, `А-Я`, `#`).
   - Scrollable body with letter sections and tag cards.

3. **`TagCard` / `TagItem`**:
   - Displays tag name and note count badge `(12)`.
   - Click handler: filters notes view by tag and switches view to Notes.
   - Dropdown menu (`...` button): "Rename", "Delete".

4. **`RenameTagDialog` & `DeleteTagDialog`**:
   - Accessible modal dialogs for inputting new tag name or confirming tag deletion.

## Responsive & Layout Rationale

- **Desktop**: Collapsible navigation rail ensures scalable space for future sections (Notebooks, Trash, RAG Index) without overcrowding the sidebar. Existing sidebar search and bottom settings button stay 100% active and untouched.
- **Mobile**: Bottom navigation bar provides native-like tabbed navigation. Tag list adapts to single column layout with touch-friendly 44px tap targets. Both EN and RU alphabet quick jump headers scale dynamically.
