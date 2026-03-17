---
phase: planning
title: Improve RAG Chunking - Planning
description: Task breakdown for configurable hierarchical chunking and indexing settings UI
---

# Project Planning & Task Breakdown

## Decision Update - 2026-03-17

Latest clarified behavior to preserve during implementation:

- chunk assembly is paragraph-first
- merge small paragraphs until `min_chunk_size` is reached
- after reaching `min_chunk_size`, only add another whole paragraph if it improves fit toward `target_chunk_size`
- do not add a whole paragraph that overshoots `target_chunk_size`, even if it still fits in `max_chunk_size`
- if still below `min_chunk_size` and the next whole paragraph would exceed `max_chunk_size`, split that paragraph internally as a compromise
- notes shorter than `min_chunk_size` are not indexed at all (`small_note_threshold` removed, `min_chunk_size` serves both roles)
- oversized paragraphs (> `max_chunk_size`) are split at `max_chunk_size` boundaries (minimal cuts, not `target_chunk_size`)
- if the last piece after splitting an oversized paragraph is below `min_chunk_size`, it is merged back into the previous piece; effective max = `max_chunk_size + min_chunk_size - 1`
- trailing undersized chunks try backward merge first
- overlap is one-directional from previous chunk into next chunk

## Planning Update - 2026-03-17

Current progress after implementation and review work:

- shared `core` settings and chunking logic exists and is already wired into indexing paths
- per-user indexing settings storage and web-only settings UI are implemented
- local Supabase Edge boot issues were resolved by switching internal `core/rag` imports to explicit local `.ts` imports and removing an incompatible `deno.lock`
- temporary chunk debug logging is enabled to inspect final indexed chunks in the browser/app console
- design and requirements were refined after implementation review: chunk assembly must be `paragraph-first`, not greedily `target_chunk_size`-first

Current risks and open execution focus:

- current chunk assembly implementation still needs to be fully aligned with the newly clarified paragraph-first planning rules
- debug observations showed chunk boundaries still drifting across paragraph boundaries more aggressively than desired
- docs are updated, but code and tests still need one more reconciliation pass to fully match the latest rules
- `ai-devkit lint --feature improve-rag-chunking` still fails on workflow metadata only because git branch `feature-improve-rag-chunking` does not exist in this repo context

Recommended next tasks:

1. Rework `core/rag/chunking.ts` so paragraph-first accumulation uses `min_chunk_size` as the first stopping condition and uses `target_chunk_size` only as a secondary preference.
2. Add/adjust unit tests for paragraph-preserving chunk assembly, fallback paragraph splitting, trailing undersized merge-back, and one-directional overlap expectations.
3. Re-run local manual indexing against representative notes and compare debug chunk output against expected paragraph-first boundaries.

Blockers / coordination:

- no product blocker is open on requirements; the remaining work is implementation alignment
- if strict workflow lint compliance is needed, create the expected git branch or worktree name `feature-improve-rag-chunking`

## Milestones

- [x] Milestone 1: Persisted indexing settings model and UI contract defined
- [x] Milestone 2: Shared `core` chunking/settings module implemented and adopted by indexing paths
- [ ] Milestone 3: Settings UI wired to runtime configuration and validated end-to-end

## Task Breakdown

### Phase 1: Settings foundation

- [x] **1.1** Finalize the persisted settings shape for indexing configuration
  - use per-user settings scope
  - store settings in a dedicated per-user table, separate from `user_api_keys`
  - place the UI under the Google API settings tab
  - define defaults for editable and read-only parameters
  - allow any user to edit their own settings

- [x] **1.2** Add backend read/write access for indexing settings
  - read resolved settings for the UI
  - save editable settings with validation
  - expose read-only system values alongside editable values

- [x] **1.3** Define validation rules
  - numeric ranges for thresholds and chunk sizes: `50..5000`
  - invariants like `min_chunk_size <= target_chunk_size <= max_chunk_size`
  - overlap constraints relative to chunk sizes
  - compatibility checks for `output_dimensionality`

### Phase 2: Chunking pipeline

- [x] **2.1** Create shared `core` module for indexing settings and hierarchical chunking
  - keep application-owned chunking
  - keep the module independent from `ui/web` and `ui/mobile`
  - expose pure helpers reusable by server and clients
  - treat this module as the canonical implementation, not as an optional helper

- [x] **2.2** Replace current fixed-window chunking in `supabase/functions/rag-index/index.ts` with the shared `core` module
  - remove hard-coded chunking constants from the main indexing flow
  - consume the shared chunk builder and template serializer

- [ ] **2.3** Implement hierarchical segmentation
  - detect sections from `h1-h6` only
  - split sections into paragraphs
  - split oversized paragraphs into sentences
  - add token/character fallback for pathological long blocks
  - status: in progress; implemented, but paragraph-first behavior still needs refinement to match latest clarified rules

- [ ] **2.4** Implement chunk assembly rules
  - single-chunk indexing for small notes
  - paragraph-first accumulation of neighboring small paragraphs
  - use `min_chunk_size` as the first stopping threshold
  - use `target_chunk_size` only as a later preference when another whole paragraph still improves fit
  - merge of undersized final chunks when possible
  - final-chunk overlap behavior
  - status: in progress; overlap is working and one-directional, but accumulation still needs to stop and extend according to the newly agreed paragraph-first rules

- [x] **2.5** Implement chunk text templating
  - title passed separately via Gemini `title`
  - optional `Section:` line
  - optional `Tags:` line
  - consistent chunk text serialization

### Phase 3: UI and compatibility

- [x] **3.1** Build indexing settings UI consumers on top of the shared contract
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
  - status: in progress; mostly done, but needs one more pass after paragraph-first chunking updates to verify end-to-end behavior

- [ ] **3.3** Reindex and rollout strategy
  - settings changes affect only future indexing and future manual reindex
  - existing indexed notes remain unchanged until manually reindexed
  - define user guidance for when manual reindex is needed
  - add observability for effective settings during indexing runs
  - status: in progress; manual reindex behavior is already true in practice, but user guidance and final rollout notes still need a cleanup pass

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
