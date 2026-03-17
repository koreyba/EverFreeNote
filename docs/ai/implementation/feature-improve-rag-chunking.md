---
phase: implementation
title: Improve RAG Chunking - Implementation Guide
description: Technical notes for configurable hierarchical chunking and indexing settings
---

# Implementation Guide

## Decision Update - 2026-03-17

Implementation must now follow these clarified chunk-assembly rules:

- treat paragraph boundaries as the default assembly boundary
- use `min_chunk_size` as the primary condition for closing a chunk assembled from small paragraphs
- after `min_chunk_size` is reached, another whole paragraph may be appended only if it improves fit toward `target_chunk_size`
- do not append a whole paragraph that would overshoot `target_chunk_size`, even if it is still within `max_chunk_size`
- if the current chunk is still below `min_chunk_size` and the next whole paragraph would exceed `max_chunk_size`, split that next paragraph internally to finish the chunk
- oversized paragraphs (> `max_chunk_size`) are split at `max_chunk_size` boundaries (minimal cuts), not at `target_chunk_size`
- if the last piece after splitting an oversized paragraph is below `min_chunk_size`, merge it back into the previous piece (backward merge); effective maximum is `max_chunk_size + min_chunk_size - 1`
- when a trailing chunk is undersized, try backward merge first and leave it undersized if merging would exceed `max_chunk_size`
- keep overlap one-directional from previous chunk into next chunk

## Development Setup

- Use the existing Supabase Edge Function flow for indexing and search.
- Keep Gemini integration aligned with the current REST-based embedding calls.
- Reuse the project's current note model inputs:
  - `title`
  - `description`
  - `tags`

Recommended local verification paths:

```bash
npx ai-devkit@latest lint --feature improve-rag-chunking
supabase functions serve rag-index --env-file .env.local
supabase functions serve rag-search --env-file .env.local
```

## Code Structure

Expected implementation touchpoints:

- `core/...`
  - shared hierarchical chunking helpers
  - shared chunk template builder
  - shared indexing settings types and validation
  - no dependency on `ui/web` or `ui/mobile`
  - canonical source of truth for indexing behavior
- `supabase/functions/rag-index/index.ts`
  - consume persisted settings
  - replace fixed chunking logic with shared `core` helpers
- `supabase/functions/rag-search/index.ts`
  - preserve query/document embedding compatibility, ideally via shared `core` settings helpers
- `supabase/migrations/...`
  - add a dedicated per-user settings table for RAG indexing settings
- settings-related web UI
  - indexing settings screen or section
  - editable and read-only parameter presentation
- settings-related mobile UI
  - out of scope for this feature
  - reuse the same shared settings contract later when mobile support is added or expanded

## Implementation Notes

### Core feature 1: runtime settings resolution

- Resolve one effective settings object per indexing run.
- Apply defaults server-side so missing values do not break indexing.
- Treat read-only fields as derived/system-defined values, not user-editable persisted state unless needed for UI convenience.
- Resolve settings per user.
- Surface these settings in the Google API settings tab.
- Load editable values from the dedicated per-user settings table and merge with system-defined read-only values.

### Core feature 2: hierarchical chunk builder

Suggested processing flow:

1. Normalize note content to a structure suitable for section/paragraph detection.
2. Compute note size using the same unit chosen for settings semantics.
3. If size is below `small_note_threshold`, emit one final chunk.
4. Otherwise:
   - split into sections using `h1-h6` tags only
   - split each section into paragraphs
   - accumulate neighboring small paragraphs paragraph-first, reaching `min_chunk_size` before considering optional extension toward `target_chunk_size`
   - split oversized paragraphs deeper by sentences
   - if still oversized, split by tokens or characters
5. After candidate chunks are created:
   - merge undersized final chunks when possible
   - apply final overlap across adjacent chunks

Keep this logic in pure functions so it can be unit tested without Supabase or Gemini.
Keep these pure functions in `core`, not inside web/mobile folders, because they represent cross-platform domain behavior.
Treat any function that changes chunk boundaries, overlap, merge behavior, or chunk text composition as `core` domain logic by default.

### Core feature 3: chunk text construction

Chunk text should be built from optional parts in a stable order:

```text
Section: {section_heading}
Tags: {tag1}, {tag2}, {tag3}

{chunk_content}
```

Implementation rules:

- omit title from chunk body text
- pass title separately to Gemini via the request `title`
- include `Section:` only when section headings are enabled and present
- include `Tags:` only when tags are enabled and non-empty
- omit optional lines entirely when inputs are absent or disabled

### Core feature 4: Gemini embedding requests

- Document chunk embeddings must use `taskType: "RETRIEVAL_DOCUMENT"`.
- Query embeddings must use `taskType: "RETRIEVAL_QUERY"`.
- Both paths must use the same `outputDimensionality`.
- `outputDimensionality` is read-only in the UI.
- If dimensions are incompatible with stored vectors or schema, fail fast with a clear operational error.

### Patterns & Best Practices

- Prefer pure deterministic helpers for parsing, splitting, accumulation, merge, and overlap.
- Keep domain logic in `core` and keep UI layers thin.
- Do not copy chunking logic into web/mobile modules for convenience; add or extend shared `core` APIs instead.
- Keep current UI work web-only, while preserving a clean shared contract for future mobile adoption.
- In paragraph-first assembly, make decisions on whole-paragraph boundaries whenever possible and only cut inside a paragraph as the explicit fallback path.
- Keep I/O boundaries thin:
  - settings fetch
  - note fetch
  - Gemini call
  - DB writes
- Log settings summaries and chunk counts, not full note content.
- Preserve existing safe reindex semantics where new chunks are prepared before stale tail cleanup.

## Integration Points

- **Supabase notes data**: source of `title`, `description`, and `tags`
- **Gemini embeddings**: destination for final chunk text and query text
- **`note_embeddings` table**: target for chunk vectors
- **Settings UI**: source of editable indexing configuration

Potential internal interfaces:

```ts
function buildChunkPlan(note: {
  title: string | null
  description: string | null
  tags: string[] | null
}, settings: RagIndexingSettings): FinalChunk[]

function validateRagIndexingSettings(input: Partial<RagIndexingSettings>): ValidatedRagIndexingSettings
```

Validation rules to enforce in both UI and server paths:

- `small_note_threshold`, `target_chunk_size`, `min_chunk_size`, `max_chunk_size`, `overlap` must each be within `50..5000`
- `min_chunk_size <= target_chunk_size <= max_chunk_size`

Representative placement:

```text
core/rag/
  indexingSettings.ts
  chunking.ts
  chunkTemplate.ts
  types.ts
```

Recommended defaults in `core`:

```ts
const DEFAULT_RAG_INDEX_SETTINGS = {
  small_note_threshold: 400,
  target_chunk_size: 500,
  min_chunk_size: 200,
  max_chunk_size: 1500,
  overlap: 100,
  use_title: true,
  use_section_headings: true,
  use_tags: true,
} as const
```

Platform-specific code should look more like adapters:

```text
supabase/functions/rag-index/
  index.ts           # fetch note/settings, call core helpers, call Gemini, persist rows

ui/web/...           # render/edit settings, send updates, display read-only values
ui/mobile/...        # no settings UI changes in this feature
```

## Error Handling

- Reject invalid settings on save and on server-side load/validation fallback.
- Fail indexing clearly when:
  - settings are inconsistent
  - dimensions are incompatible
  - section parsing returns unusable structure
  - Gemini embedding count mismatches final chunk count
- Preserve existing index when a reindex attempt fails before successful replacement.

## Performance Considerations

- Avoid repeated full-text reparsing in the same indexing run.
- Keep hierarchical splitting linear or near-linear in note size for ordinary documents.
- Batch Gemini embedding calls for final chunks, not intermediate fragments.
- Bound worst-case chunk counts to prevent runaway splitting on malformed content.

## Security Notes

- Continue to keep Gemini API credentials server-side only.
- Restrict settings updates to authorized users/roles.
- Do not expose hidden system parameters as editable values in the UI.
- Avoid logging full note text, tags, or titles in production diagnostics unless explicitly sanitized.
