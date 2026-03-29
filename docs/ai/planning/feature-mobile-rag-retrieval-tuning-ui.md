---
phase: planning
title: Mobile RAG Retrieval Tuning UI
description: Task breakdown for bringing retrieval tuning parity to the mobile app
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Mobile requirements/design docs created and validated (`docs/ai/requirements/feature-mobile-rag-retrieval-tuning-ui.md`, `docs/ai/design/feature-mobile-rag-retrieval-tuning-ui.md`)
- [x] Milestone 2: Mobile settings and search UI wired to persisted retrieval settings
- [x] Milestone 3: Tests and validation pass for mobile retrieval tuning flow
- [x] Milestone 4: Mobile `Indexing (RAG)` screen reaches web parity for RAG indexing settings

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Mobile settings parity
- [x] Task 1.1: Extend mobile API key settings panel to load and show retrieval settings
- [x] Task 1.2: Add editable `topK` controls and read-only retrieval metadata to mobile settings
- [x] Task 1.3: Preserve Gemini key save/remove flows and fallback/default states
- [x] Task 1.4: Add editable RAG indexing settings and indexing metadata to the mobile `Indexing (RAG)` screen

### Phase 2: Mobile search parity
- [x] Task 2.1: Remove preset selector from mobile search controls
- [x] Task 2.2: Add precision slider with commit-on-release behavior
- [x] Task 2.3: Update mobile search mode state to remove preset persistence
- [x] Task 2.4: Update mobile AI search hook to use persisted retrieval settings instead of presets
- [x] Task 2.5: Align mobile `Load more` handling with the current backend contract

### Phase 3: Testing & regression coverage
- [x] Task 3.1: Update mobile unit tests for settings panels
- [x] Task 3.2: Add mobile tests for search controls / search hook behavior
- [x] Task 3.3: Run mobile-targeted tests and full validation

## Dependencies
**What needs to happen in what order?**

- Retrieval settings UI depends on the existing shared `RagSearchSettingsService`, which is already available.
- Indexing settings UI depends on the existing shared `RagIndexSettingsService` and the `ragIndexing` payload from `api-keys-status`.
- Search screen updates depend on replacing preset-based state in `useMobileSearchMode`.
- Search hook updates depend on the same shared retrieval settings model used in settings.
- Tests should be updated after the settings/search/indexing contracts settle.

## Timeline & Estimates
**When will things be done?**

- Docs + implementation alignment: small
- Mobile settings/search implementation: medium
- Testing and regression pass: medium

Overall estimate: moderate continuation feature, smaller than the original web feature because backend/core contracts already exist.

## Risks & Mitigation
**What could go wrong?**

- Risk: mobile search still has platform-specific assumptions tied to presets
  - Mitigation: isolate preset removal to `useMobileSearchMode` and `useMobileAIPaginatedSearch`
- Risk: mobile settings panel becomes too crowded
  - Mitigation: use sectioned layout and keep read-only metadata compact
- Risk: mobile tests may be more brittle around sliders and async settings loads
  - Mitigation: prefer hook/service-level assertions plus focused component tests
- Risk: mobile Jest may fail before reaching feature tests because shared core imports resolve through the repository root
  - Mitigation: keep `@babel/runtime` available for the shared `core/*` import graph and patch virtual-only mocks in `tests/setupTests.ts`

## Resources Needed
**What do we need to succeed?**

- Existing shared retrieval settings service/model in `core`
- Existing mobile search/settings test harness
- Existing backend contracts already deployed for web parity
