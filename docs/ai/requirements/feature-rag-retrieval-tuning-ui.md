---
phase: requirements
title: RAG Retrieval Tuning UI
description: User-configurable retrieval controls for indexed-note AI search in the web app
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

The indexed-note AI search already works, but retrieval behavior is effectively hard-coded in the web UI. The current `Strict / Neutral / Broad` selector changes both `topK` and the similarity threshold together, which makes tuning search quality coarse and opaque.

- Affected users: EverFreeNote users who already index notes and want to tune semantic search quality without code changes or redeploys.
- Current situation: retrieval parameters are encoded as fixed presets in the web client, while the `rag-search` Edge Function already accepts numeric `topK` and threshold values.
- Current workaround: edit source constants and redeploy, or accept the preset behavior even when it does not fit the query or note corpus.

## Goals & Objectives
**What do we want to achieve?**

### Primary goals
- Make retrieval settings configurable at the user level, not hard-coded in the web UI.
- Keep Gemini embedding task types fixed and visible:
  - document/chunk embeddings use `RETRIEVAL_DOCUMENT`
  - search query embeddings use `RETRIEVAL_QUERY`
- Move `topK` into persisted user settings with default `15`.
- Replace the current 3-state preset control in the web search UI with a similarity-threshold slider.
- Persist the slider's committed threshold value at the user level.
- Trigger a new AI search only when the slider interaction is committed, not on every drag update.
- Improve `Load more` behavior with a `+1` overfetch pattern so the UI can hide the button when no further results exist.

### Secondary goals
- Expose retrieval-related parameters in UI even when some are read-only.
- Preserve current default retrieval behavior as closely as possible on rollout.
- Keep the retrieval settings model reusable for a future mobile UI.

### Non-goals
- No changes to indexing or chunking behavior.
- No changes to the Gemini model selection.
- No MCP / LLM answer-generation pipeline changes.
- No mobile UI implementation in this feature.
- No redesign of result grouping, note-level ranking, or offset-based deduplication beyond what is needed to surface settings accurately.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want retrieval settings to live in Settings so I can tune semantic search without code changes.
- As a user, I want the search UI to expose a precision slider so I can make results stricter or broader while searching.
- As a user, I want `topK` to be configurable separately from similarity threshold so I can control candidate breadth independently from filtering strictness.
- As a user, I want the search UI copy to stay in English.
- As a user, I want `Load more` to stop appearing once there are no more retrievable results.
- As a future mobile product owner, I want the retrieval settings logic to live in shared core code so mobile can adopt it later without rethinking the data model.

### Key workflows
- User opens Settings, changes persisted `topK`, and future AI searches use that page size.
- User performs AI search in web UI and adjusts the precision slider.
- While dragging the slider, the UI updates locally but does not fire a search request.
- When the user releases the slider on a new value, that value is persisted and the current AI search reruns once.
- When the user presses `Load more`, the next page is requested using the persisted `topK` page size and the UI hides the button when no further page exists.

### Edge cases
- User changes the slider before any AI search has been submitted: the new value is persisted, but no request is fired yet.
- User sets a low threshold and still gets few results because the indexed corpus is small or `topK` is low.
- User sets a high threshold and gets zero results even though near matches exist below the threshold.
- Retrieval returns additional chunks that collapse during grouping/deduplication; the UI should still avoid repeated empty `Load more` clicks caused by backend pagination uncertainty.
- User has no custom retrieval settings saved yet: defaults are applied.

## Success Criteria
**How will we know when we're done?**

- [ ] Retrieval settings are persisted per user and loaded on sign-in.
- [ ] Default `topK` is `15`.
- [ ] Existing preset buttons are removed from the web AI search UI.
- [ ] Web AI search exposes a similarity-threshold slider with English UI copy.
- [ ] The committed slider value is persisted per user.
- [ ] Slider-driven refetch happens only on commit/release when the committed value changed.
- [ ] `rag-search` continues using fixed Gemini task types:
  - `RETRIEVAL_DOCUMENT` for note chunks
  - `RETRIEVAL_QUERY` for search queries
- [ ] UI exposes the task types and `output_dimensionality`, even if read-only.
- [ ] `Load more` uses a `+1` overfetch pattern and no longer relies on the old heuristic based only on returned count matching requested count.
- [ ] Existing indexing behavior and settings remain unchanged.
- [ ] Shared retrieval settings types/services live in core so mobile can reuse them later.

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical constraints
- The current AI search flow already relies on `rag-search`, `match_notes`, client-side grouping, and offset-based deduplication.
- Gemini embedding logic is fixed:
  - `rag-index` uses `RETRIEVAL_DOCUMENT`
  - `rag-search` uses `RETRIEVAL_QUERY`
- `output_dimensionality` is currently fixed at `1536`.
- Search UI changes are web-only for now.
- Retrieval settings must be persisted at the user level, not just in `localStorage`.

### Assumptions
- A new persisted retrieval-settings record can be introduced without changing note-index schema.
- Existing default threshold behavior should remain effectively neutral on rollout; baseline default threshold is `0.55`.
- The precision slider can use a numeric threshold internally while presenting friendlier copy in the UI.
- Slider range is `0.00..1.00` with `0.05` commit granularity.
- Overfetching by one result is acceptable from a latency and payload perspective.

## Questions & Open Items
**What do we still need to clarify?**

- None at this stage. Product decisions for this phase are resolved:
  - `topK` becomes a persisted user setting with default `15`
  - the search UI removes the preset selector
  - similarity threshold moves to a web slider
  - slider refetch occurs on commit/release
  - UI copy remains English
