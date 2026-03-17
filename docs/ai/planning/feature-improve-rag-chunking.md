---
phase: planning
title: Improve RAG Chunking - Planning
description: Task breakdown for configurable hierarchical chunking and indexing settings UI
---

# Project Planning & Task Breakdown

## Milestones

- [ ] Milestone 1: Persisted indexing settings model and UI contract defined
- [ ] Milestone 2: Shared `core` chunking/settings module implemented and adopted by indexing paths
- [ ] Milestone 3: Settings UI wired to runtime configuration and validated end-to-end

## Task Breakdown

### Phase 1: Settings foundation

- [ ] **1.1** Finalize the persisted settings shape for indexing configuration
  - use per-user settings scope
  - store settings in a dedicated per-user table, separate from `user_api_keys`
  - place the UI under the Google API settings tab
  - define defaults for editable and read-only parameters
  - allow any user to edit their own settings

- [ ] **1.2** Add backend read/write access for indexing settings
  - read resolved settings for the UI
  - save editable settings with validation
  - expose read-only system values alongside editable values

- [ ] **1.3** Define validation rules
  - numeric ranges for thresholds and chunk sizes
  - invariants like `min_chunk_size <= target_chunk_size <= max_chunk_size`
  - overlap constraints relative to chunk sizes
  - compatibility checks for `output_dimensionality`

### Phase 2: Chunking pipeline

- [ ] **2.1** Create shared `core` module for indexing settings and hierarchical chunking
  - keep application-owned chunking
  - keep the module independent from `ui/web` and `ui/mobile`
  - expose pure helpers reusable by server and clients
  - treat this module as the canonical implementation, not as an optional helper

- [ ] **2.2** Replace current fixed-window chunking in `supabase/functions/rag-index/index.ts` with the shared `core` module
  - remove hard-coded chunking constants from the main indexing flow
  - consume the shared chunk builder and template serializer

- [ ] **2.3** Implement hierarchical segmentation
  - detect sections from `h1-h6` only
  - split sections into paragraphs
  - split oversized paragraphs into sentences
  - add token/character fallback for pathological long blocks

- [ ] **2.4** Implement chunk assembly rules
  - single-chunk indexing for small notes
  - accumulation of neighboring small paragraphs up to target size
  - merge of undersized final chunks when possible
  - final-chunk overlap behavior

- [ ] **2.5** Implement chunk text templating
  - title passed separately via Gemini `title`
  - optional `Section:` line
  - optional `Tags:` line
  - consistent chunk text serialization

### Phase 3: UI and compatibility

- [ ] **3.1** Build indexing settings UI consumers on top of the shared contract
  - web only in this feature
  - editable controls for chunk parameters and inclusion flags
  - read-only section for `output_dimensionality`, task types, and system chunking rules
  - save/reset feedback states
  - explicit character-based labels for size fields

- [ ] **3.2** Wire active settings into indexing and query compatibility paths
  - `rag-index` consumes live settings
  - query embedding path preserves matching `output_dimensionality`
  - incompatible settings are blocked with actionable errors
  - web UI consumes the shared settings shape in this phase
  - mobile reuse is deferred, but the shared contract must remain mobile-compatible
  - reject any duplicated per-platform chunking implementation during rollout/review

- [ ] **3.3** Reindex and rollout strategy
  - settings changes affect only future indexing and future manual reindex
  - existing indexed notes remain unchanged until manually reindexed
  - define user guidance for when manual reindex is needed
  - add observability for effective settings during indexing runs

## Dependencies

- Existing `rag-index` and `rag-search` Edge Functions remain the integration points.
- Existing `note_embeddings` storage and vector search path must stay compatible with chosen dimensions.
- The settings UI depends on an agreed storage location and permission model.
- Any change to embedding dimensions may depend on database migration or controlled rollout sequencing.

## Timeline & Estimates

- **Phase 1: Settings foundation** — medium effort
- **Phase 2: Chunking pipeline** — high effort
- **Phase 3: UI and compatibility** — medium effort

Suggested implementation order:

1. settings model and validation
2. shared `core` chunking library and unit tests
3. `rag-index` integration
4. settings UI consumers
5. compatibility checks and reindex guidance

## Risks & Mitigation

- **Risk:** ambiguous section parsing from HTML-rich notes
  - **Mitigation:** define deterministic heading extraction rules and fallback behavior early

- **Risk:** invalid settings create unusable chunking behavior
  - **Mitigation:** enforce server-side validation and safe defaults

- **Risk:** `output_dimensionality` changes break vector compatibility
  - **Mitigation:** gate incompatible changes and require reindex/migration workflow

- **Risk:** hierarchical chunking increases implementation complexity
  - **Mitigation:** isolate chunking into a testable pure `core` module before wiring to the Edge Function and UI consumers

- **Risk:** settings changes create stale mixed-version indexes
  - **Mitigation:** surface reindex requirements in UI and track effective settings during indexing

## Resources Needed

- Access to current RAG indexing/search implementation for integration updates
- Supabase local or staging environment for vector compatibility testing
- Representative note fixtures:
  - very small notes
  - multi-section notes
  - notes with many short paragraphs
  - notes with one oversized paragraph
  - notes with and without tags
