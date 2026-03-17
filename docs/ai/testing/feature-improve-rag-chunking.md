---
phase: testing
title: Improve RAG Chunking - Testing Strategy
description: Test plan for configurable hierarchical chunking and indexing settings
---

# Testing Strategy

## Test Coverage Goals

- Unit test coverage target: 100% of new chunking and settings-validation logic
- Shared `core` logic is the primary unit-test target so behavior stays identical across web/mobile consumers
- Integration coverage: critical `rag-index` and settings save/load paths
- Manual/E2E coverage: settings UI behavior and representative indexing outcomes
- Validation against requirements:
  - small notes stay whole when appropriate
  - large notes split on natural boundaries first
  - tiny chunks merge where possible
  - overlap behavior is applied between final chunks
  - title/section/tags participate according to active settings

## Unit Tests

### Chunking settings validation

- [ ] Reject values below `50`
- [ ] Reject values above `5000`
- [ ] Reject `min_chunk_size > target_chunk_size`
- [ ] Reject `target_chunk_size > max_chunk_size`
- [ ] Reject overlap values that exceed allowed bounds
- [ ] Accept valid settings and fill defaults for omitted values

### Hierarchical segmentation

- [ ] Small note below `small_note_threshold` returns a single final chunk
- [ ] Multi-section note with `h1-h6` headings prefers section boundaries before paragraph fallback
- [ ] Notes without headings fall back directly to paragraph splitting
- [ ] Non-heading styled text does not create synthetic sections
- [ ] Oversized paragraph splits by sentences before token/character fallback
- [ ] Extremely long sentence falls back to token/character splitting

### Chunk accumulation and merge rules

- [ ] Adjacent small paragraphs accumulate toward `target_chunk_size`
- [ ] Accumulation stops before violating `max_chunk_size`
- [ ] Undersized final trailing chunk merges with previous neighbor when allowed
- [ ] Undersized chunk remains standalone when merging would exceed `max_chunk_size`
- [ ] Overlap duplicates only boundary content between adjacent final chunks

### Chunk text templating

- [ ] Title is excluded from chunk body text
- [ ] Title is passed separately to embedding payload construction
- [ ] `Section:` line appears only when enabled and data exists
- [ ] `Tags:` line appears only when enabled and tags exist
- [ ] Chunk text preserves stable ordering and spacing

### Shared module boundaries

- [ ] Shared chunking/settings helpers can be imported without web-only dependencies
- [ ] Shared chunking/settings helpers can be imported without mobile-only dependencies
- [ ] Platform UIs consume shared `core` contracts instead of reimplementing logic locally
- [ ] Review catches any new per-platform chunking fork as an architectural regression

## Integration Tests

- [ ] Settings read endpoint/function returns editable and read-only parameters together
- [ ] Settings update rejects invalid combinations with clear validation errors
- [ ] `rag-index` uses persisted settings instead of hard-coded chunking constants
- [ ] `rag-index` indexes a small note as exactly one chunk
- [ ] `rag-index` indexes a multi-section note into coherent multi-chunk output
- [ ] `rag-index` preserves safe reindex semantics when embedding generation fails
- [ ] `rag-search` query embedding uses `RETRIEVAL_QUERY`
- [ ] Query and document embedding dimensions remain aligned after settings changes

## End-to-End Tests

- [ ] Open the Google API settings tab and verify all editable parameters are present
- [ ] Verify read-only parameters, including `output_dimensionality`, are visible but not editable
- [ ] Save valid settings and confirm they persist after reload
- [ ] Attempt to save invalid settings and confirm inline validation blocks the change
- [ ] Reindex a small note and verify one chunk is produced
- [ ] Reindex a long structured note and verify chunk count changes according to settings
- [ ] Toggle title inclusion off and verify indexed chunk bodies do not gain title text
- [ ] Toggle section heading and tag inclusion on/off and verify chunk content changes accordingly

## Test Data

Create or reuse fixtures covering:

- a tiny note with no headings
- a note with several short neighboring paragraphs
- a note with multiple `h1-h6` headings and subsections
- a note with bold or visually prominent text that is not an actual heading tag
- a note with one extremely large paragraph
- a note with tags and a note without tags
- a note whose final candidate chunk would otherwise be too small

## Test Reporting & Coverage

- Recommended commands:

```bash
npm run test -- --coverage
npx ai-devkit@latest lint --feature improve-rag-chunking
```

- Record coverage for:
  - chunking helpers
  - settings validation
  - settings UI components
  - `rag-index` integration paths

## Manual Testing

- [ ] Review settings UI labels for clarity and units
- [ ] Verify all size labels explicitly say they are measured in characters
- [ ] Verify read-only values visually communicate that they are system-defined
- [ ] Check behavior with realistic notes imported from the app, not only synthetic fixtures
- [ ] Confirm no redeploy is required for settings changes to take effect
- [ ] Confirm users understand that settings changes affect only future indexing/manual reindex and do not retroactively update existing indexes
- [ ] Confirm no mobile settings UI was introduced as part of this feature

## Performance Testing

- [ ] Benchmark indexing time for:
  - short note
  - medium note with headings
  - large note with many paragraphs
  - pathological large single-paragraph note
- [ ] Compare chunk counts and indexing latency against the previous fixed-window implementation
- [ ] Verify no excessive explosion in chunk count under worst-case fallback splitting

## Outstanding Gaps

- [ ] Decide whether overlap should also be constrained to be less than or equal to `max_chunk_size`
