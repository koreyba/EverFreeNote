---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Scope
Feature: honest note count display (`Notes displayed: X out of Y`) across normal view and FTS search, with unknown totals handled gracefully.

## Coverage Goals
- Component tests for Sidebar label (known totals and unknown totals).
- Component tests for NoteList FTS header (uses server total when provided, falls back to loaded count when total is unknown).
- Light manual sanity: load more in search shows unknown until final page, then exact total.

## Component Tests
- Sidebar
  - Renders label with provided counts (`Notes displayed: 5 out of 12`).
  - Renders label with unknown total (`Notes displayed: 5 out of unknown` when `notesTotal` is `undefined`).
- NoteList (FTS mode)
  - Shows “Found: 50 notes” when `ftsData.total = 50` (even if only part is loaded).
  - Shows “Found: 2 notes” when `ftsData.total` is undefined and 2 results are loaded.

## Manual/Exploratory Checklist
- Basic search with small result set: label shows exact numbers.
- Search with multiple pages: label shows `unknown` while “Load more” is available; after final page shows exact total.
- Verify “Load more” still appears when last page size == limit and total unknown; disappears on partial page.

## Commands
- Type check: `npm run type-check`
- Lint: `npm run eslint -- --max-warnings=0`
- Component tests: `npm run test:component -- --spec "cypress/component/features/notes/Sidebar.cy.tsx,cypress/component/features/notes/NoteList.cy.tsx"`

## Outstanding
- No E2E added; rely on component tests + manual sanity for pagination. Add E2E later if search flow regresses.
