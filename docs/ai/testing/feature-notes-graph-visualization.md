---
phase: testing
title: Notes Graph Visualization
description: Testing strategy for the web notes-by-tags graph view
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit tests cover graph data construction, tag normalization, link generation, and summary counts.
- Component tests cover the sidebar entry action.
- TypeScript checks cover integration with `NotesShell`, `Sidebar`, and graph library types.
- Manual QA should validate canvas rendering, responsive layout, and light/dark theme readability.

## Unit Tests
**What individual components need testing?**

### `notesGraphData`
- [x] Normalizes duplicate and mixed-case tags.
- [x] Builds note nodes, tag nodes, and note-to-tag links.
- [x] Counts graph density and sorts top tags by connection count.
- [ ] Add future tests for tag id encoding if tags with reserved URL characters become common.

## Integration Tests
**How do we test component interactions?**

- [x] `Sidebar` calls `onOpenGraphView` when the graph action is provided.
- [ ] Future: `NotesShell` opens graph and closes search in a dedicated component test.
- [ ] Future: `NotesShell` closes graph when opening search.
- [ ] Future: clicking a note node selects the note after a reliable graph test harness is available.

## End-to-End Tests
**What user flows need validation?**

- [ ] User opens notes, clicks `Graph View`, sees graph panel.
- [ ] User filters by a popular tag and sees graph scope narrow.
- [ ] User clicks a note node and sees the note open.
- [ ] User closes the graph and returns to the notes list/editor layout.

## Test Data
**What data do we use for testing?**

- Unit tests use small in-memory `Note` objects with mixed tags.
- Component tests use the existing sidebar Cypress harness and mocked Supabase provider.
- Manual QA should include:
  - notes with no tags
  - notes with duplicate/mixed-case tags
  - at least one shared tag across multiple notes
  - enough notes to make label hiding and zoom useful

## Test Reporting & Coverage
**How do we verify and communicate test results?**

Planned commands:

```bash
npm run type-check
npm run type-check:tests
npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/lib/notesGraphData.test.ts
npm run test:component -- --spec "cypress/component/features/notes/Sidebar.cy.tsx"
npm run eslint
npm run build
npx ai-devkit@latest lint
```

Latest verified results:

- `npm run type-check`: passed
- `npm run type-check:tests`: passed
- `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/lib/notesGraphData.test.ts`: passed, 3 tests
- `npm run test:component -- --spec "cypress/component/features/notes/Sidebar.cy.tsx"`: passed, 16 tests
- `npm run eslint`: passed with `--max-warnings=0`
- `npm run build`: passed
- `npx ai-devkit@latest lint`: passed
- `npx ai-devkit@latest lint --feature notes-graph-visualization`: feature docs passed, branch-name convention check failed because the active branch is `autonomyai/notes_graph_visualization_20260410-pr`

## Manual Testing
**What requires human validation?**

- Canvas renders nonblank after opening the graph.
- Graph remains inside the available panel on desktop and mobile widths.
- Labels are readable when zoomed and do not dominate the initial view.
- Active note highlighting is visible.
- Light and dark themes keep node/link contrast acceptable.

## Performance Testing
**How do we validate performance?**

- Use loaded note sets at small, medium, and large currently paginated sizes.
- Confirm text/tag filters update without visible UI stalls.
- Confirm graph panel unmounts cleanly when closed.

## Bug Tracking
**How do we manage issues?**

- Blocking issues: type-check failures, graph panel blank state for tagged notes, note click not opening existing note, or broken notes shell layout.
- Non-blocking follow-ups: full-corpus graph fetch, note-to-note derived edges, advanced graph clustering controls.
