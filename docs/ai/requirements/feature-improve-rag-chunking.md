---
phase: requirements
title: Configurable RAG Indexing Chunking
description: Requirements for hierarchical note chunking and explicit indexing settings in the UI
---

# Requirements & Problem Understanding

## Decision Update - 2026-03-17

This feature now uses a stricter `paragraph-first` interpretation of hierarchical chunking. These decisions were made after initial drafting and must override any older wording below if there is a conflict.

- Paragraphs are the primary chunk assembly unit.
- Small neighboring paragraphs may be merged, but reaching `min_chunk_size` is the first stopping condition.
- After `min_chunk_size` is reached, the chunk may include additional whole paragraphs only when they still fit naturally and move the chunk closer to `target_chunk_size`.
- If the next whole paragraph would overshoot `target_chunk_size`, it must not be added just to make the chunk larger, even if it would still fit within `max_chunk_size`.
- If a chunk is still below `min_chunk_size` and the next whole paragraph fits within `max_chunk_size`, that whole paragraph should be added.
- If a chunk is still below `min_chunk_size` but the next whole paragraph would exceed `max_chunk_size`, the next paragraph may be split internally as a compromise to reach a valid chunk.
- Notes shorter than `min_chunk_size` are not indexed at all (the `small_note_threshold` parameter has been removed; `min_chunk_size` now serves both as the minimum chunk size and the minimum note size for indexing).
- Oversized paragraphs (> `max_chunk_size`) are split at `max_chunk_size` boundaries (minimal cuts) by sentences and then by token/character fallback when needed.
- If the last piece after splitting an oversized paragraph is below `min_chunk_size`, it is merged back into the previous piece (backward merge). This may produce a chunk slightly above `max_chunk_size`, bounded by `max_chunk_size + min_chunk_size - 1`.
- A trailing undersized chunk should first try to merge backward with the previous chunk; if that would exceed `max_chunk_size`, the undersized tail remains as-is.
- Overlap remains one-directional: each next chunk repeats a suffix of the previous chunk at its beginning.
- Overlap should prefer natural boundaries, currently using explicit stop points such as sentence-ending period, section boundary, or text boundary.

## Problem Statement

RAG note indexing currently uses fixed, mostly implicit chunking and embedding settings in code. This makes indexing quality harder to tune, hides important system behavior from the UI, and forces redeploys for changes that should be configuration-driven.

- **Affected users:** users relying on AI note search quality, plus operators/developers configuring the indexing pipeline.
- **Current situation:** note chunking is primarily fixed-size and code-defined, title/content composition is not fully explicit in the UI, and key Gemini embedding settings are only visible in implementation.
- **Pain points:**
  - small notes may be split more than necessary
  - large notes are not consistently split on natural boundaries first
  - chunk construction rules are not transparent in the UI
  - indexing settings cannot be adjusted from the UI without redeploy

## Goals & Objectives

### Primary goals

- Make indexing behavior explicit and visible in the UI.
- Move indexing tuning to configuration that can be changed without redeploy.
- Improve chunking quality with hierarchical splitting based on natural boundaries.
- Standardize chunk payload construction so every indexed chunk is formed consistently.
- Keep Gemini responsible only for embeddings, not chunk generation.
- Place reusable indexing logic in shared `core` code so it is independent of web and mobile UI layers.
- Establish `core` as the single source of truth for indexing rules so web and mobile cannot drift in behavior.

### Secondary goals

- Preserve small notes as a single chunk whenever possible.
- Allow operators to control whether title, section headings, and tags participate in indexing.
- Expose fixed Gemini task types in the UI as read-only system settings.

### Non-goals (explicitly out of scope)

- Changing search ranking, retrieval thresholds, top-k behavior, or other search tuning parameters.
- Using an LLM to generate chunks.
- Changing the search UX or search result presentation.
- Indexing attachments, OCR, or non-note content.
- Adding a mobile-app UI for editing indexing settings in this phase.

## User Stories & Use Cases

- **As a user configuring AI indexing**, I want to see all indexing parameters in the UI so that system behavior is understandable and auditable.
- **As a user configuring AI indexing**, I want these settings to live in my Google API settings area so that related AI configuration is managed in one place.
- **As a user configuring AI indexing**, I want to edit chunk sizing and overlap settings so that indexing quality can be tuned without redeploy.
- **As a user configuring AI indexing**, I want title, section headings, and tags to be explicit indexing inputs that can be enabled or disabled.
- **As a user searching small notes**, I want notes shorter than `min_chunk_size` to be skipped during indexing, since they lack enough content for meaningful semantic search.
- **As a user searching large notes**, I want notes to be split on natural boundaries first so that retrieved chunks stay coherent.
- **As a system**, I want tiny neighboring paragraphs to accumulate into a target-sized chunk so that the index avoids fragmented low-value chunks.
- **As a system**, I want tiny neighboring paragraphs to merge paragraph-first so that natural paragraph boundaries stay intact whenever possible.
- **As a system**, I want oversized paragraphs to split deeper by sentences and then by token/character fallback so that no final chunk exceeds the configured maximum.
- **As a system**, I want undersized final chunks to merge with neighbors when possible so that chunk quality remains consistent.

### Key workflows

- User opens indexing settings in the UI and sees all editable and read-only indexing parameters.
- User opens the Google API settings tab and sees all editable and read-only indexing parameters there.
- User changes editable indexing parameters and saves them without redeploying the app.
- A note is indexed using hierarchical chunking in this order:
  1. section / subsection boundaries
  2. paragraphs
  3. sentences
  4. token or character fallback
- The app creates final chunks, applies overlap between adjacent final chunks, and sends chunk text plus metadata to Gemini embeddings.

### Edge cases

- Note is shorter than `min_chunk_size` and should not be indexed.
- Note has no section headings and must fall back directly to paragraph-based chunking.
- A paragraph is larger than `max_chunk_size` and must be split deeper.
- The last chunk is too small and should merge with a neighbor if size constraints allow.
- A note has no tags; chunk formatting must still stay valid.
- A setting change affects future indexing and may require reindexing of existing notes to take effect consistently.

## Success Criteria

- [ ] Indexing configuration is available in the UI without requiring redeploy.
- [ ] The UI shows all indexing parameters involved in chunk construction and Gemini embedding configuration.
- [ ] Chunking, chunk-template construction, and settings validation logic live in shared `core` code and do not depend on web-only or mobile-only modules.
- [ ] Web, mobile, and server-side indexing paths reuse the same `core` indexing rules instead of reimplementing them per platform.
- [ ] Indexing settings are exposed in the user's Google API settings tab.
- [ ] Indexing settings UI is added on the website only for this feature.
- [ ] Editable UI settings include:
  - `target_chunk_size`
  - `min_chunk_size`
  - `max_chunk_size`
  - `overlap`
  - use title
  - use section headings
  - use tags
- [ ] Read-only UI settings include:
  - document `taskType = RETRIEVAL_DOCUMENT`
  - query `taskType = RETRIEVAL_QUERY`
  - `output_dimensionality`
  - `split_strategy`
  - `fallback_split_order`
  - chunk structure template
  - chunk accumulation rule
  - small chunk merge rule
- [ ] Notes shorter than `min_chunk_size` are not indexed (0 chunks returned, existing embeddings removed).
- [ ] Larger notes are split by natural boundaries before using sentence-level and token/character fallback splitting.
- [ ] Small adjacent paragraphs accumulate paragraph-first, reaching `min_chunk_size` first and extending toward `target_chunk_size` only when additional whole paragraphs fit naturally.
- [ ] Oversized paragraphs are split deeper until all final chunks satisfy `max_chunk_size`.
- [ ] Undersized final chunks are merged with adjacent chunks when possible without violating configured limits.
- [ ] `overlap` is applied as repeated boundary content between adjacent final chunks, not as an intermediate split rule.
- [ ] `overlap` is one-directional: the next chunk repeats the previous chunk's tail at its beginning.
- [ ] `overlap` should prefer natural boundaries instead of starting from the middle of a sentence when a supported stop point is available.
- [ ] Title is passed separately through the Gemini API `title` field and is not duplicated inside chunk text.
- [ ] Size-based settings are explicitly labeled in the UI as character-based values.
- [ ] Indexed chunk text follows one consistent template:

```text
Section: {section_heading}
Tags: {tag1}, {tag2}, {tag3}

{chunk_content}
```

- [ ] Chunk text can include section headings and tags conditionally, based on UI settings.
- [ ] If section headings or tags are disabled or absent, their corresponding lines are omitted entirely from the final chunk text.

## Constraints & Assumptions

### Technical constraints

- Chunking is performed by the application/service layer, not by Gemini.
- Shared chunking and indexing-settings logic must be implemented in `core` so both web and mobile clients can reuse the same behavior.
- `core` is the authoritative source for chunking behavior; platform layers may adapt inputs/outputs but must not define competing chunking rules.
- This feature adds indexing-settings UI only on web; mobile remains a future consumer of the shared `core` logic and settings contract.
- Gemini is used only for embeddings.
- Chunk embeddings must use `RETRIEVAL_DOCUMENT`.
- Query embeddings must use `RETRIEVAL_QUERY`.
- Those task types are system parameters and must be shown in the UI as read-only values.
- Title must be sent separately in the Gemini API `title` field and must not be embedded as part of chunk body text.
- Chunk body text is composed from note content plus optional section heading and optional tags.
- Existing note data already provides `title`, `description`, and `tags`; section headings must be derived from note content structure.
- Existing vector storage currently assumes a fixed embedding dimension in the database schema, so changing `output_dimensionality` must remain compatible with storage and query paths.
- Indexing settings are user-scoped settings shown in the user's Google API settings tab.

### Assumptions

- Search parameter tuning remains out of scope for this feature, except for keeping query embedding compatibility explicit in the UI.
- Configuration changes should apply without redeploy, but they affect only future indexing operations and future manual reindex operations.
- Existing indexed notes are not automatically reindexed or marked stale by this feature.
- The same `output_dimensionality` must be used consistently for document and query embeddings.
- `output_dimensionality` is displayed as read-only in the UI.
- Size-based parameters are defined in characters in v1 and must be labeled that way in the UI.
- Any omitted optional chunk parts (`Section`, `Tags`) should disappear entirely rather than render as empty labels.
- Editable numeric indexing parameters use an allowed range of `50..5000`.
- Server-side validation must also enforce logical ordering: `min_chunk_size <= target_chunk_size <= max_chunk_size`.
- `target_chunk_size` remains relevant for deciding whether another whole paragraph should be added after `min_chunk_size` has already been reached.
- `min_chunk_size` serves double duty: it is both the minimum chunk size during assembly and the minimum note size for indexing eligibility.

## Questions & Open Items

- Start defaults are fixed as:
  - `target_chunk_size = 500`
  - `min_chunk_size = 200`
  - `max_chunk_size = 1500`
  - `overlap = 100`
- No remaining open items in requirements.
