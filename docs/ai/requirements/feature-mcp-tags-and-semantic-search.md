---
phase: requirements
title: MCP Tags & Semantic Search — Requirements
description: Give AI agents the tag vocabulary, incremental tag editing and the existing RAG index through MCP
---

# Requirements & Problem Understanding

## Problem Statement

The MCP server exposes four tools (`list_notes`, `get_note`, `create_note`, `update_note`). Working with tags through them is possible but awkward, and the notebook's semantic index is not reachable at all.

What already works today:

- `list_notes` accepts a single exact `tag` and returns summaries (id, title, tags, dates, excerpt) rather than full bodies, so the "narrow down, then open one note" flow is already supported.
- `get_note` returns a note's tags.
- `update_note` can set tags.

What does not:

- **No tag vocabulary.** An agent cannot discover which tags exist. It has to guess a tag name or page through every note. The web app builds this list client-side from the notes it has loaded (`getTagsWithCounts`); there is no server-side source.
- **One tag per query.** `list_notes` filters by a single tag, so "notes tagged both `work` and `urgent`" is impossible.
- **Tag edits are destructive.** `update_note` replaces the whole tag list. To add one tag an agent must read the note, append, and send everything back. Any tag added in the meantime by the user or another agent is silently lost.
- **The RAG index is unreachable.** Notes are embedded with Gemini and searchable by meaning through the `rag-search` Edge Function, but only from the web app. Agents are limited to substring matching, which misses paraphrases.

## Goals & Objectives

### Primary Goals
- Expose the tag vocabulary with usage counts.
- Filter notes by several tags at once, with a choice of "all of these" or "any of these".
- Add and remove individual tags without resending the whole list.
- Expose semantic search over the existing RAG index, returning notes to open rather than raw chunks.

### Non-Goals
- Renaming a tag across the notebook, or deleting a tag everywhere. Both are bulk mutations over many notes; out of scope until the single-note operations prove themselves.
- Triggering indexing (`rag-index`) from MCP. Indexing is a cost- and quota-bearing operation that belongs in the app's own settings.
- Changing the user's RAG settings (`top_k`, threshold, embedding model) through MCP.
- A new database migration. The tag vocabulary is aggregated from the notes the user can already read.

## User Stories

| ID | Story |
|----|-------|
| US-1 | As a notebook owner, I want the agent to tell me which tags I use and how often, so I can ask it to work with a tag without remembering the exact spelling. |
| US-2 | As a notebook owner, I want to ask for notes carrying several tags at once. |
| US-3 | As a notebook owner, I want the agent to add a tag to a note without touching the tags already there. |
| US-4 | As a notebook owner, I want the agent to remove one tag from a note and leave the rest alone. |
| US-5 | As a notebook owner, I want the agent to find notes by meaning, not only by the words I typed, and then open the ones that look right. |
| US-6 | As a notebook owner, when semantic search is unavailable because I have not set up a Gemini key or have not indexed my notes, I want to be told exactly that instead of getting an empty result. |

## Success Criteria

- An agent can list tags, filter by several of them, add and remove tags on a note, and run a semantic search, all through spec-compliant MCP tool calls.
- Tag comparison is case-insensitive and preserves the spelling already stored on the note, matching how the web app groups tags.
- Adding a tag that is already present, or removing one that is absent, succeeds and changes nothing.
- Semantic search returns one entry per note (id, title, tags, best similarity, matching excerpts), so the agent can then call `get_note`.
- Missing Gemini key, unindexed notes and an embedding-model mismatch each produce a distinct, actionable message.
- New code is covered by Jest, including protocol-level tests through the MCP SDK client; `type-check`, `eslint` and `deno check` stay clean.

## Constraints & Assumptions

- **No new secrets.** Semantic search reuses `rag-search`, which already loads and decrypts the user's Gemini key server-side. The MCP function forwards the caller's bearer token; nothing else is needed.
- **RLS everywhere.** Tag aggregation and note reads run through the user-scoped Supabase client, as the existing tools do.
- **Deno compatibility.** New shared code lives in `core/mcp/` and follows the same rule as the rest of that directory: relative imports with explicit `.ts` extensions, no `@/` aliases.
- **Tag vocabulary is computed, not stored.** There is no RPC for it, so the tool selects the `tags` column for the user's notes and aggregates in memory. This is bounded by a cap and reports when the cap was hit.
- Semantic search depends on the user having configured a Gemini API key and indexed their notes.

## Questions & Open Items

- Should the tag vocabulary become a database RPC (`unnest` + `group by`) if notebooks grow past the aggregation cap? Deferred; it would need a migration deployed to both projects.
- Should bulk tag rename/delete be exposed later, and if so with what confirmation, given an agent could rewrite hundreds of notes in one call?
