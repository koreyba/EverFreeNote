---
phase: implementation
title: Notes Graph Visualization
description: Implementation notes for the web notes-by-tags graph view
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Run `npx ai-devkit@latest lint` before phase work.
- Feature docs use `notes-graph-visualization` as the normalized feature name.
- Current branch is `autonomyai/notes_graph_visualization_20260410-pr`, not `feature-notes-graph-visualization`; this is an existing branch checkout, so implementation continues in the current context.
- Install/update dependencies with `npm install` after package changes.

## Code Structure
**How is the code organized?**

- `ui/web/lib/notesGraphData.ts`
  - pure data transformation and graph summary helpers
- `ui/web/components/features/notes/NotesGraphView.tsx`
  - graph panel UI and force-graph rendering
- `ui/web/components/features/notes/NotesShell.tsx`
  - shell-level graph/search/editor visibility wiring
- `ui/web/components/features/notes/Sidebar.tsx`
  - graph entry action
- `ui/web/tests/unit/lib/notesGraphData.test.ts`
  - unit coverage for graph data generation
- `cypress/component/features/notes/Sidebar.cy.tsx`
  - component coverage for graph entry action

## Implementation Notes
**Key technical details to remember:**

### Graph builder
- Use `normalizeTagList` from `@ui/web/lib/tags`.
- Create one note node per loaded note.
- Create one tag node per normalized tag.
- Link each note node to each of its normalized tag nodes.
- Size tag nodes from connection count.
- Sort top tags by descending count, then alphabetically.

### Graph view
- Use `react-force-graph-2d` inside the client component.
- Use `ResizeObserver` to keep canvas dimensions aligned with the panel.
- Use local state for text filter and selected tag.
- Use `zoomToFit` after graph data changes.
- Keep labels hidden until zoomed in enough; show active note label regardless.
- Use icon buttons for close and sidebar action where applicable.

### Shell integration
- `showGraphView` is owned by `NotesShell`.
- `handleOpenGraphView` closes search before opening graph.
- `handleOpenSearchPanel` closes graph before opening/focusing search.
- Note node click uses the existing `handleSelectNote` flow.

## Integration Points
**How do pieces connect?**

- `Sidebar.onOpenGraphView` is optional so existing sidebar consumers are not forced to provide it.
- `NotesGraphView.onNodeClick` is optional so the component remains reusable in tests or future previews.
- `notesTotal` is passed from the controller so the graph can display loaded scope when pagination means not every note is present.

## Error Handling
**How do we handle failures?**

- No network calls are added.
- Empty graph states cover:
  - zero notes
  - notes without tags
  - filters that match no linked graph
- `handleGraphNodeClick` catches controller selection failures through the existing fire-and-forget pattern used elsewhere in `NotesShell`.

## Performance Considerations
**How do we keep it fast?**

- Graph data and summaries are memoized from `notes` and filter state.
- Text filtering is local to the loaded notes.
- The force graph is scoped to loaded notes, avoiding accidental full-corpus rendering.
- No graph work happens when the panel is not mounted.

## Security Notes
**What security measures are in place?**

- The feature only uses notes already available to the authenticated client.
- No note content is sent to a new service.
- No secrets, settings, or Supabase policies are changed.

