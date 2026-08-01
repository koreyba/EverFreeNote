---
phase: implementation
title: Tag Management Implementation Guide
description: Implementation notes and guidelines for core tag logic and web UI.
---

# Implementation Guide

## Code Structure

- `core/types/tags.ts`: Core interfaces for tag metrics and alphabetical groupings.
- `core/services/tags.ts`: Core functions for tag aggregation, alphabetical grouping, renaming, deleting, and cleanup across note lists.
- `core/tests/unit/tags.test.ts`: Jest unit tests for tag service.
- `ui/web/components/features/tags/`:
  - `TagsPage.tsx`: Main management page component.
  - `AlphabeticalGrid.tsx`: Interactive A-Z quick jump index grid.
  - `TagCard.tsx`: Individual tag row/card with count badge and action menu.
  - `RenameTagDialog.tsx`: Dialog for editing tag name.
  - `DeleteTagDialog.tsx`: Confirmation dialog for deleting tag.
- `ui/web/components/features/navigation/NavRail.tsx`: Collapsible navigation rail for desktop & mobile bottom navigation bar.

## Patterns & Guidelines

- **Case-Insensitive Deduplication & Display**: Tags in notes should be aggregated case-insensitively while preserving canonical casing for display.
- **Pure Core Logic**: Core functions in `core/services/tags.ts` must be pure functions without DOM or browser dependencies, allowing instant reuse in React Native.
