---
phase: requirements
title: RAG Retrieval Tuning UI
description: User-configurable retrieval controls for indexed-note AI search, including embedding-model alignment safeguards
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
- Keep retrieval intent fixed and visible across supported embedding presets:
  - document/chunk embeddings continue using `RETRIEVAL_DOCUMENT`
  - search query embeddings use one of two preset-specific Gemini request shapes:
    - `models/gemini-embedding-001` sends `taskType: RETRIEVAL_QUERY`
    - `models/gemini-embedding-2-preview` prefixes the retrieval instruction into the request body text instead of sending `taskType`
- Move `topK` into persisted user settings with default `15`.
- Replace the current 3-state preset control in the web search UI with a similarity-threshold slider.
- Persist the slider's committed threshold value at the user level.
- Persist a separate retrieval embedding-model preset in `user_rag_search_settings`.
- Block AI retrieval whenever the retrieval preset differs from the active indexing preset until the user manually reindexes notes into the new embedding space.
- Trigger a new AI search only when the slider interaction is committed, not on every drag update.
- Improve `Load more` behavior with a `+1` overfetch pattern so the UI can hide the button when no further results exist.

### Secondary goals
- Expose retrieval-related parameters in UI even when some are read-only.
- Preserve current default retrieval behavior as closely as possible on rollout.
- Keep the retrieval settings model reusable across web and mobile settings UI.

### Non-goals
- No changes to indexing or chunking behavior.
- No MCP / LLM answer-generation pipeline changes.
- No automatic background reindex job when the retrieval preset changes.
- No redesign of result grouping, note-level ranking, or offset-based deduplication beyond what is needed to surface settings accurately.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want retrieval settings to live in Settings so I can tune semantic search without code changes.
- As a user, I want the search UI to expose a precision slider so I can make results stricter or broader while searching.
- As a user, I want `topK` to be configurable separately from similarity threshold so I can control candidate breadth independently from filtering strictness.
- As a user, I want the search UI copy to stay in English.
- As a user, I want `Load more` to stop appearing once there are no more retrievable results.
- As a user, I want a clear warning when I switch the retrieval embedding model and my indexed notes are still on the old embedding space.
- As a user, I want a direct path to reindex my notes once retrieval is paused by an embedding-model mismatch.
- As a mobile product owner, I want the retrieval settings logic to live in shared core code so mobile and web use the same data model and warning rules.

### Key workflows
- User opens Settings, changes persisted `topK`, and future AI searches use that page size.
- User performs AI search in web UI and adjusts the precision slider.
- While dragging the slider, the UI updates locally but does not fire a search request.
- When the user releases the slider on a new value, that value is persisted and the current AI search reruns once.
- When the user presses `Load more`, the next page is requested using the persisted `topK` page size and the UI hides the button when no further page exists.
- User changes the retrieval embedding preset in Settings and immediately sees a warning that AI search is paused until reindex completes.
- User clicks `Reindex now` from the warning state and is routed into the existing AI Index flow to run a manual reindex.

### Edge cases
- User changes the slider before any AI search has been submitted: the new value is persisted, but no request is fired yet.
- User sets a low threshold and still gets few results because the indexed corpus is small or `topK` is low.
- User sets a high threshold and gets zero results even though near matches exist below the threshold.
- Retrieval returns additional chunks that collapse during grouping/deduplication; the UI should still avoid repeated empty `Load more` clicks caused by backend pagination uncertainty.
- User has no custom retrieval settings saved yet: defaults are applied.
- Existing users who never changed the retrieval preset remain on `models/gemini-embedding-001` and should not be forced to reindex on rollout.
- User saves a retrieval preset that differs from the current indexing preset: `rag-search` returns `409` with `code: "embedding_model_mismatch"` and message `Embedding model changed. Please reindex your notes to enable search.`

## Success Criteria
**How will we know when we're done?**

- [ ] Retrieval settings are persisted per user and loaded on sign-in.
- [ ] Default `topK` is `15`.
- [ ] Existing preset buttons are removed from the web AI search UI.
- [ ] Web AI search exposes a similarity-threshold slider with English UI copy.
- [ ] The committed slider value is persisted per user.
- [ ] Slider-driven refetch happens only on commit/release when the committed value changed.
- [ ] `rag-search` continues using fixed retrieval intent for each supported preset:
  - note chunks are indexed with `RETRIEVAL_DOCUMENT`
  - `models/gemini-embedding-001` query requests send `taskType: RETRIEVAL_QUERY`
  - `models/gemini-embedding-2-preview` query requests encode the retrieval instruction in the text body instead of `taskType`
- [ ] `rag-search` resolves the active retrieval embedding preset from `user_rag_search_settings.embedding_model`.
- [ ] `rag-search` blocks mismatched embedding spaces with `409`, `code: "embedding_model_mismatch"`, and message `Embedding model changed. Please reindex your notes to enable search.`
- [ ] UI exposes the task types and `output_dimensionality`, even if read-only.
- [ ] Web and mobile settings surfaces show a warning banner and `Reindex now` path whenever indexing and retrieval presets differ.
- [ ] `Load more` uses a `+1` overfetch pattern and no longer relies on the old heuristic based only on returned count matching requested count.
- [ ] Existing indexing behavior and settings remain unchanged.
- [ ] Existing users stay on the default retrieval preset unless they opt into a new embedding model.
- [ ] Shared retrieval settings types/services live in core so web and mobile stay aligned.

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical constraints
- The current AI search flow already relies on `rag-search`, `match_notes`, client-side grouping, and offset-based deduplication.
- Gemini embedding behavior is preset-aware but fixed per supported model:
  - `rag-index` continues using `RETRIEVAL_DOCUMENT` for note chunks
  - `rag-search` reads `user_rag_search_settings.embedding_model` and emits one of two supported query request shapes:
    - `models/gemini-embedding-001`: structured content plus `taskType: RETRIEVAL_QUERY`
    - `models/gemini-embedding-2-preview`: structured content whose text body carries the retrieval instruction prefix instead of a `taskType` field
- `output_dimensionality` is currently fixed at `1536`.
- Search results UI changes are web-only for now, but settings persistence and mismatch warnings must stay compatible with mobile settings.
- Retrieval settings must be persisted at the user level, not just in `localStorage`.
- Server-side retrieval preset resolution is sourced from `user_rag_search_settings`, while active indexing preset resolution stays in `user_rag_index_settings`.
- `rag-search` must return `409` and `code: "embedding_model_mismatch"` whenever those resolved presets differ, and clients should route users into a manual reindex flow rather than auto-reindexing in the background.

### Assumptions
- A new persisted retrieval-settings record can be introduced without changing note-index schema.
- Existing default threshold behavior should remain effectively neutral on rollout; baseline default threshold is `0.55`.
- The precision slider can use a numeric threshold internally while presenting friendlier copy in the UI.
- Slider range is `0.00..1.00` with `0.05` commit granularity.
- Overfetching by one result is acceptable from a latency and payload perspective.
- Rollout migration uses schema defaults / legacy fallback reads to keep old users on `models/gemini-embedding-001`.
- Reindexing after a preset switch is user-triggered through the existing AI Index tooling, not automatic.

## Questions & Open Items
**What do we still need to clarify?**

- None at this stage. Product decisions for this phase are resolved:
  - `topK` becomes a persisted user setting with default `15`
  - the search UI removes the preset selector
  - similarity threshold moves to a web slider
  - slider refetch occurs on commit/release
  - UI copy remains English
  - retrieval preset changes pause AI search until manual reindex completes
