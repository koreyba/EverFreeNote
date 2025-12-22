---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Use existing Expo mobile setup in `ui/mobile`.
- No additional environment variables expected for tags.
- Ensure web behavior is available as reference for parity.

## Code Structure
**How is the code organized?**

- Screens live in `ui/mobile/app/(tabs)` and `ui/mobile/app/note`.
- Reusable UI lives in `ui/mobile/components`.
- Data access remains in existing hooks/services (`@ui/mobile/hooks`, `@core`).

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Tag display: add tag chips to note list cards, note detail, and search results.
- Tag editing: add input to create tags, and allow removal on note detail.
- Tag filtering: on chip tap, apply filter in list/search views.

### Patterns & Best Practices
- Reuse core tag normalization/validation utilities if they exist.
- Keep UI state local to the screen, but rely on core data for source of truth.
- Avoid heavy re-renders inside virtualized lists.

## Integration Points
**How do pieces connect?**

- Use existing note read/update hooks to persist tag changes.
- Use existing search/list hooks to apply tag filters.
- Keep tag UI components theme-aware and consistent with existing styles.

## Error Handling
**How do we handle failures?**

- Surface tag update errors with existing error UI patterns.
- Prevent duplicate tags on the client when possible.
- Gracefully handle empty/invalid tag input.

## Performance Considerations
**How do we keep it fast?**

- Keep tag chip layout lightweight in list rows.
- Limit visible chips or wrap responsibly to avoid layout thrash.
- Avoid synchronous heavy parsing on every render.

## Security Notes
**What security measures are in place?**

- Use existing auth and data access controls from core.
- Treat tags as user input; rely on existing sanitization/validation.
