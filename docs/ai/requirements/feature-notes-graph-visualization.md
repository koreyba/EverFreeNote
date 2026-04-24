---
phase: requirements
title: Notes Graph Visualization
description: Interactive notes-by-tags graph view for exploring relationships across the loaded note corpus
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

EverFreeNote users can tag notes, search notes, and open individual note records, but they do not have a compact visual way to understand how topics cluster across their note collection. A previous branch attempted a graph view, but the feature was incomplete: it rendered nodes without enough context, controls, or documentation to make the visualization useful.

- Affected users: web users with tagged notes who want to discover topic clusters and jump into related notes.
- Current situation: users can scan lists and tag chips, but relationships between tags and notes are not visible as a whole.
- Current workaround: manually filter by tags or search for keywords one at a time.

## Goals & Objectives
**What do we want to achieve?**

### Primary goals
- Add a web notes graph view that visualizes loaded notes and their tags.
- Represent notes and tags as distinct node types with note-to-tag links.
- Make shared tags behave as visible hubs so related notes cluster together.
- Allow users to open a note from the graph.
- Allow users to filter the graph by text and popular tags.
- Communicate graph scope clearly when only the currently loaded note page is available.
- Keep the view usable in the existing notes shell on desktop and mobile breakpoints.

### Secondary goals
- Keep graph data transformation testable outside React/canvas rendering.
- Avoid adding unrelated tooling or broad documentation churn.
- Preserve existing notes list, editor, search panel, selection, and settings workflows.

### Non-goals
- No database schema changes.
- No new server endpoint for fetching all notes.
- No AI-based clustering or embeddings.
- No cross-user/shared-note graph.
- No mobile-native implementation in `ui/mobile`.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a note taker, I want to open a graph from the notes sidebar so I can see topic relationships without leaving the notes workspace.
- As a note taker, I want tag nodes to visually stand out so I can spot common topics.
- As a note taker, I want to click a note node so I can open that note in the existing editor/view area.
- As a note taker, I want to click or select a tag so I can focus the graph on notes connected to that tag.
- As a note taker, I want to search/filter within the graph so I can narrow a dense corpus quickly.
- As a user with no tagged notes, I want a clear empty state instead of a blank canvas.

### Edge cases
- The user has no notes.
- The user has notes, but none have tags.
- The current filter matches no graph links.
- Tags include mixed case, extra spaces, or duplicate values on a note.
- The loaded list is only a subset of the total note count.
- The graph panel is opened while search is open.
- The user selects a note while the graph is open.

## Success Criteria
**How will we know when we're done?**

- [x] The feature has lifecycle docs under requirements, design, planning, implementation, and testing.
- [x] `npx ai-devkit@latest lint` passes for the base docs structure.
- [x] The graph is reachable from the web notes sidebar.
- [x] Opening the graph closes the search panel, and opening search closes the graph.
- [x] Notes and tags render as distinct graph nodes.
- [x] Tag nodes scale by connection count.
- [x] Text and tag filters update the graph without server calls.
- [x] Empty states distinguish no notes, no tags, and no matches.
- [x] Clicking a note node opens the note through the existing notes controller.
- [x] Graph data building is covered by unit tests.
- [x] TypeScript, targeted tests, lint, and production build pass after dependency installation.

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical constraints
- The current notes shell uses the loaded notes from `useNoteAppController`; this feature must not introduce a new full-corpus query.
- The graph library runs in the client component only.
- Canvas rendering should be treated as interactive UI, while graph data transformation stays in plain TypeScript for tests.
- Existing routes and notes persistence remain unchanged.

### Assumptions
- "Graph of notes by tags" means a bipartite note/tag graph, not a note-to-note similarity graph.
- Current loaded notes are an acceptable first release scope, as long as the UI shows the loaded count.
- Existing tag normalization rules in `@ui/web/lib/tags` are the source of truth.
- English UI copy remains consistent with the existing web application.

## Questions & Open Items
**What do we still need to clarify?**

- Future enhancement: decide whether the graph should fetch the full note corpus instead of the currently loaded list.
- Future enhancement: decide whether note-to-note edges should be derived from shared tags for a denser relationship graph.
- Devkit note: `npx ai-devkit@latest lint --feature notes-graph-visualization` validates all feature docs but still reports a branch-name miss because this work continues on the existing branch `autonomyai/notes_graph_visualization_20260410-pr`.
