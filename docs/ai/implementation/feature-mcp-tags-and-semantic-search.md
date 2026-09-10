---
phase: implementation
title: MCP Tags & Semantic Search — Implementation Guide
description: How the tag tools and the RAG-backed semantic search are built
---

# Implementation Guide

## Code Structure

```
core/mcp/
  tagVocabulary.ts     dedupeTags, aggregateTags, filterTags, applyTagEdit, tagsUnchanged — all pure
  semanticSearch.ts    SemanticSearch port, groupChunksByNote, mapUnavailableResponse — all pure
  types.ts             ListNotesParams.tags/tagMatch, TagVocabulary, EditNoteTagsInput, two repository methods
  supabaseNotebookRepository.ts  tag filters, listTags, editNoteTags
  notebookServer.ts    list_tags, edit_note_tags, search_notes_semantic; widened list_notes
supabase/functions/mcp/index.ts  createRagSemanticSearch — the only place that talks to rag-search
```

## Implementation Notes

### Case handling
Tags are compared case-insensitively and stored with their original spelling, matching `getTagsWithCounts` in the web app. `aggregateTags` reports the first spelling it sees; `applyTagEdit` keeps the note's existing spelling for tags that stay and the caller's for genuinely new ones. Removals are applied before additions, so `{add: ['Work'], remove: ['work']}` re-spells a tag rather than cancelling out.

### Tag filters map to the GIN index
`tag_match: 'all'` becomes PostgREST `.contains()` (`tags @> ARRAY[...]`), `'any'` becomes `.overlaps()` (`tags && ARRAY[...]`). Both use `idx_notes_tags`. The default is `all`: with several tags, "notes tagged X and Y" is the ordinary reading, and with one tag the two are identical.

### The tag vocabulary is computed, not stored
No RPC exists for it, so `listTags` selects only the `tags` column for the user's notes, skips notes with no tags (`.not('tags', 'eq', '{}')`) and aggregates in memory, capped at `TAG_SCAN_NOTE_LIMIT` (5000). The result carries `truncated` so an agent does not present a partial list as complete. If a notebook ever reaches the cap, the fix is an `unnest` + `group by` RPC, which needs a migration on both projects.

### `edit_note_tags` is read-modify-write
Read the note through the user-scoped client (RLS gives "not found" for a foreign note), compute the next list, and write only when it actually differs. A no-op edit returns the note unchanged with a success result, so a retried call is harmless. This is not atomic against a concurrent writer, but the window is one round trip rather than the agent's whole turn — which is what `update_note`'s blind replacement costs.

### Semantic search delegates rather than duplicates
`core/mcp` never talks to Gemini or pgvector. It depends on the `SemanticSearch` port; the Edge Function implements it by POSTing to `/functions/v1/rag-search` with the caller's bearer token. That function already loads the user's encrypted Gemini key, decrypts it with the server-side secret, embeds the query and runs `match_notes` under RLS. Reimplementing any of that in `core/mcp` would put the decryption secret in a second place and duplicate the RAG settings logic.

Request body: `{ query, topK, threshold, filterTag? }`, with `topK` bounded by the tool's `limit` and `threshold` defaulting to 0.55 (the value in `core/rag/searchSettings.ts`).

Response handling:

| From `rag-search` | Tool result |
|---|---|
| 200 with chunks | grouped per note, best similarity, up to 3 excerpts of 300 characters |
| 200 with none | success with an empty list and a sentence explaining the threshold |
| 400 mentioning an API key | tool error telling the user to add a Gemini key in Settings |
| 409, or a body with an `embedding_model` code | tool error telling the user to re-index |
| 404 | tool error saying AI indexing is not set up |
| anything else | tool error with the upstream message |

Setup gaps come back as `{status: 'unavailable', reason, message}` rather than a thrown error, because they are facts to relay, not failures to retry.

The tool is only registered when a `SemanticSearch` port is supplied, so the protocol tests can exercise the notebook without it and a deployment without RAG simply does not advertise it.

## Error Handling

| Situation | Result |
|---|---|
| `edit_note_tags` with nothing to add or remove (including blank-only lists) | tool error, repository untouched |
| `edit_note_tags` on a missing or foreign note | `Note not found` |
| `list_tags` / repository failures | `Failed to list tags: …` |
| Semantic search setup gap | the actionable message from `mapUnavailableResponse` |
| Semantic search upstream failure | `Semantic search failed: …` |

## Security Notes

- No new secret and no new privilege. Tag work uses the same user-scoped client under RLS; semantic search forwards the caller's own token to a function in the same project.
- The forwarded token goes only to `${SUPABASE_URL}/functions/v1/rag-search`, an origin the function already trusts.
- Every semantic query spends the notebook owner's Gemini quota. The tool description states this so an agent prefers `list_notes` when a literal match would do.
