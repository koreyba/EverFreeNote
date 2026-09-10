---
phase: planning
title: MCP Tags & Semantic Search — Planning
description: Task breakdown for the tag tools and the RAG-backed semantic search
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: tag vocabulary and incremental tag editing available through MCP
- [x] Milestone 2: `list_notes` filters by several tags
- [x] Milestone 3: semantic search over the existing RAG index
- [x] Milestone 4: docs updated, full check suite green

## Task Breakdown

### Phase 1: Pure logic
- [x] Task 1.1: `core/mcp/tagVocabulary.ts` — dedupe, aggregate, filter, incremental edit (+ 17 tests)
- [x] Task 1.2: `core/mcp/semanticSearch.ts` — port types, chunk grouping, unavailable-response mapping (+ 12 tests)

### Phase 2: Data access
- [x] Task 2.1: `types.ts` — `tags`/`tagMatch` on the list params, `listTags` and `editNoteTags` on the repository
- [x] Task 2.2: `supabaseNotebookRepository.ts` — `@>`/`&&` tag filters, capped tag scan, read-modify-write tag edit (+ 12 tests)

### Phase 3: Tools
- [x] Task 3.1: `list_tags`, `edit_note_tags`, `search_notes_semantic` registered; `list_notes` widened
- [x] Task 3.2: protocol tests through the MCP SDK client (+ 15 tests)

### Phase 4: Wiring and docs
- [x] Task 4.1: Edge Function builds the `rag-search`-backed `SemanticSearch`
- [x] Task 4.2: requirements, design, implementation, testing docs; `docs/MCP_SETUP.md` tool table
- [x] Task 4.3: `npm run test:unit`, `type-check`, `eslint`, `deno check`
- [ ] Task 4.4: deploy the `mcp` function to stage and prod, acceptance from a real client

## Dependencies

- 1.1/1.2 → 2.x → 3.x → 4.1.
- Semantic search depends on the `rag-search` function already deployed in the target project, on the user having a Gemini API key configured, and on their notes being indexed. None of these is created by this change.

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Tag scan grows with the notebook | Capped at `TAG_SCAN_NOTE_LIMIT` with a `truncated` flag in the result; an `unnest` RPC is the escape hatch if it is ever reached |
| Two agents editing tags concurrently | `edit_note_tags` narrows the window to one round trip instead of a whole agent turn; a fully atomic version needs an RPC |
| Semantic search spends the user's Gemini quota | The tool description says so and tells the agent to prefer `list_notes` for literal matches |
| `rag-search` contract drifts | The response mapping is one pure function with its own tests; `deno check` covers the call site |
| Agents keep calling `update_note` for tag-only edits | Both the server instructions and the `update_note` description point at `edit_note_tags` |

## Resources Needed

- Supabase CLI access to redeploy the `mcp` function to both projects.
- A notebook with a Gemini key and an existing index to exercise semantic search end to end.
