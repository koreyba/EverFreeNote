---
phase: planning
title: Tag Management Implementation Planning
description: Milestone breakdown, tasks, dependencies, and timeline for tag management feature.
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Core Tag Service & Unit Tests (`@core`)
- [x] Milestone 2: Navigation Layout & Access Architecture (Desktop & Mobile)
- [x] Milestone 3: Tag Management Web Page & Alphabetical Grid UI
- [x] Milestone 4: Tag Rename & Delete Mutations Integration
- [x] Milestone 5: Full Verification & Test Coverage

## Task Breakdown

### Phase 1: Core Service (`core/services/tags.ts`)
- [x] Task 1.1: Create `core/types/tags.ts` data structures (`TagWithCount`, `AlphabeticalTagGroup`).
- [x] Task 1.2: Implement `getTagsWithCounts`, `groupTagsAlphabetically`, `renameTagInNotes`, `deleteTagFromNotes`.
- [x] Task 1.3: Write 100% test coverage for `@core` tag services (`core/tests/unit/tags.test.ts`).

### Phase 2: Navigation & Access UI
- [x] Task 2.1: Design and implement `NavRail.tsx` Collapsible Left Navigation Dock for desktop & Mobile Navigation Bar.
- [x] Task 2.2: Wire navigation state in `useNoteAppController` to switch active main view (Notes View vs. Tag Management View).

### Phase 3: Web Tag Management View (`ui/web/components/features/tags/`)
- [x] Task 3.1: Create `TagsPage.tsx` with search input and header stats.
- [x] Task 3.2: Implement `AlphabeticalGrid.tsx` / Quick Jump Bar for A-Z & А-Я navigation.
- [x] Task 3.3: Implement `TagCard.tsx` displaying `Tag Name (Count)` and 3-dots action menu (`DropdownMenu`).
- [x] Task 3.4: Implement `RenameTagDialog.tsx` and `DeleteTagDialog.tsx`.

### Phase 4: Controller & Mutators Integration
- [x] Task 4.1: Connect Rename / Delete actions in UI controller to batch update notes via `useNoteAppController`.
- [x] Task 4.2: Wire tag selection to set `filterByTag` and switch back to filtered Notes view.

### Phase 5: Verification & Testing
- [x] Task 5.1: Write unit and integration tests for Tag Management UI components.
- [x] Task 5.2: Fast type check, linting, and unit test suite verification.
