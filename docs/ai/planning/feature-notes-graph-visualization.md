---
phase: planning
title: Notes Graph Visualization
description: Task breakdown for finishing the notes-by-tags graph view
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Recover requirements and design from the branch state
- [x] Milestone 2: Make the graph view useful inside the notes shell
- [x] Milestone 3: Complete verification and final review

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Documentation and Scope
- [x] Task 1.1: Run base `ai-devkit` lint
- [x] Task 1.2: Search memory for existing notes graph guidance
- [x] Task 1.3: Create lifecycle docs for `feature-notes-graph-visualization`
- [x] Task 1.4: Document the current branch-name exception

### Phase 2: Graph Data Foundation
- [x] Task 2.1: Extract graph data construction into a pure helper module
- [x] Task 2.2: Normalize tags using existing web tag utilities
- [x] Task 2.3: Add summary data for counts and top tags
- [x] Task 2.4: Add unit tests for graph data construction

### Phase 3: Graph UX Completion
- [x] Task 3.1: Add graph header, stats, legend, and loaded-count context
- [x] Task 3.2: Add text filter and top-tag filters
- [x] Task 3.3: Add distinct empty states for no notes, no tags, and no matches
- [x] Task 3.4: Highlight the active note
- [x] Task 3.5: Keep search and graph panes mutually exclusive

### Phase 4: Verification
- [x] Task 4.1: Remove unfinished Storybook setup from this branch
- [x] Task 4.2: Update component coverage around the sidebar graph action
- [x] Task 4.3: Run dependency install/update after package scope changes
- [x] Task 4.4: Run TypeScript checks
- [x] Task 4.5: Run targeted unit/component tests
- [x] Task 4.6: Run lint and production build

## Status Summary
**What is the current execution status?**

Implemented on existing branch `autonomyai/notes_graph_visualization_20260410-pr`. The feature now has complete lifecycle docs, a tested graph data builder, a more useful graph panel with search/tag filters and empty states, cleaned package scope, and successful verification across TypeScript, ESLint, targeted unit/component tests, and production build. Base `ai-devkit` lint passes. Feature-scoped `ai-devkit` lint validates all docs and only fails the expected branch-name convention check because this branch predates the normalized `feature-notes-graph-visualization` branch name.

## Dependencies
**What needs to happen in what order?**

- Lifecycle docs should exist before final implementation sign-off.
- `notesGraphData` must be implemented before unit tests can cover graph construction.
- Package lock must be regenerated after removing Storybook dev dependencies and keeping `react-force-graph-2d`.
- Type-check depends on dependencies being installed into `node_modules`.

## Timeline & Estimates
**When will things be done?**

- Documentation recovery: Small
- Data foundation and tests: Small
- UX completion: Medium
- Verification and fixes: Medium, depending on existing project lint/test state

## Risks & Mitigation
**What could go wrong?**

- Risk: graph appears incomplete because it only includes loaded notes.
  - Mitigation: show loaded count and keep future full-corpus fetch as an explicit follow-up.
- Risk: dense graphs become visually noisy.
  - Mitigation: labels appear only after zoom, tag filters provide quick narrowing, and tag node size communicates hubs.
- Risk: canvas rendering is hard to test.
  - Mitigation: test graph data construction separately and use component tests for entry points.
- Risk: extra tooling dependencies bloat the branch.
  - Mitigation: remove unfinished Storybook setup and keep only the graph runtime dependency.

## Resources Needed
**What do we need to succeed?**

- Existing `NoteAppController` loaded notes and selection handlers
- Existing web tag normalization utilities
- `react-force-graph-2d` runtime dependency
- Jest unit tests for pure graph data
- Cypress component test for the sidebar graph action
