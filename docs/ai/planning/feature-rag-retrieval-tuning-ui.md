---
phase: planning
title: RAG Retrieval Tuning UI
description: Task breakdown for user-configurable retrieval settings and web precision controls
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Shared retrieval settings model and persistence are implemented
- [ ] Milestone 2: Web settings UI exposes editable and read-only retrieval parameters
- [ ] Milestone 3: Web AI search uses the precision slider and exact `hasMore` behavior

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Add shared core retrieval-settings module
  - Defaults: `top_k = 15`, `similarity_threshold = 0.55`
  - Read-only constants for task types, output dimensionality, dedup threshold, and overfetch behavior
  - Validation/coercion helpers

- [ ] Task 1.2: Add persisted storage for user retrieval settings
  - Create DB storage for per-user retrieval settings
  - Define defaults when no row exists

- [ ] Task 1.3: Extend status/upsert Edge Functions and service layer
  - `api-keys-status` returns `ragSearch`
  - `api-keys-upsert` accepts retrieval settings updates
  - Add `RagSearchSettingsService` in core

### Phase 2: Web Search & Settings UI
- [ ] Task 2.1: Add retrieval settings UI to web settings
  - Editable `topK`
  - Read-only task types and output dimensionality

- [ ] Task 2.2: Remove preset selector from web AI search
  - Remove preset state from `useSearchMode`
  - Remove preset UI from web search components

- [ ] Task 2.3: Add precision slider to web AI search
  - English-only UI copy
  - Draft vs committed slider state
  - Persist committed threshold to user settings
  - Trigger refetch only on commit/release when value changed

### Phase 3: Retrieval Flow & Pagination Polish
- [ ] Task 3.1: Update `useAIPaginatedSearch` to use persisted `topK`
  - `topK` becomes page size and initial visible count
  - `Load more` increments by `topK`

- [ ] Task 3.2: Add `+1` overfetch in `rag-search`
  - Return `hasMore`
  - Stop relying on client heuristic for `Load more`

- [ ] Task 3.3: Verify regression safety
  - Existing indexing settings untouched
  - Existing Gemini task types unchanged
  - Existing AI search result grouping/dedup still works

## Dependencies
**What needs to happen in what order?**

- Shared core retrieval settings must exist before UI or Edge Function wiring.
- Persisted storage must exist before user-level settings can be loaded/saved.
- Search hook changes depend on the final retrieval settings contract.
- `+1` overfetch should land before final `Load more` UI behavior is considered done.
- Mobile is intentionally excluded from implementation, but shared core work should not be web-specific.

## Timeline & Estimates
**When will things be done?**

- Phase 1: Medium
- Phase 2: Medium
- Phase 3: Small to Medium

Total expected implementation size: moderate, mostly integration and settings plumbing rather than new retrieval algorithms.

## Risks & Mitigation
**What could go wrong?**

- Risk: retrieval settings drift from existing search behavior on rollout
  - Mitigation: keep defaults aligned with the current neutral behavior (`15 / 0.55`)

- Risk: slider UX causes too many unintended network requests
  - Mitigation: search only on commit/release, not on every drag update

- Risk: `hasMore` still feels inconsistent after grouping/deduplication
  - Mitigation: compute `hasMore` from backend retrieval results, then separately preserve existing client grouping rules

- Risk: retrieval settings get implemented only for web and become hard to reuse
  - Mitigation: keep schema/defaults/validation in core from the start

## Resources Needed
**What do we need to succeed?**

- Existing `rag-search` and `api-keys-*` Edge Function patterns
- Existing indexing-settings service and panel as structural reference
- Shared constants/types in core
- Manual QA for web AI search interactions and slider behavior
