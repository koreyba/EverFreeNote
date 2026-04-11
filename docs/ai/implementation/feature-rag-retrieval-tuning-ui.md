---
phase: implementation
title: RAG Retrieval Tuning UI
description: Implementation guide for persisted retrieval settings and the web precision slider
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Work on branch `feature-rag-retrieval-tuning-ui`
- Use existing Supabase Edge Function workflows and local web app setup
- Validate docs with:
  - `npx ai-devkit@latest lint`
  - `npx ai-devkit@latest lint --feature rag-retrieval-tuning-ui`

## Code Structure
**How is the code organized?**

- Shared retrieval settings schema/defaults/validation belong in `core`
- Web settings UI and search slider belong in `ui/web`
- Edge Function persistence and retrieval behavior belong in `supabase/functions`
- Indexing-related modules now share the same embedding-model preset catalogue so indexing and search stay vector-compatible
- The cross-platform mismatch contract lives in `docs/ai/design/feature-rag-embedding-model-mismatch.md`

## Implementation Notes
**Key technical details to remember:**

### Core features
- Feature 1: Add a shared retrieval-settings module similar to indexing settings
- Feature 2: Extend the status/upsert settings flow with a new `ragSearch` payload
- Feature 3: Update web AI search to use:
  - persisted `topK`
  - committed persisted similarity threshold
  - backend-provided `hasMore`
- Feature 4: Keep the settings screen resilient and operable when local settings services are temporarily unavailable
- Feature 5: Support explicit Gemini API key removal without overloading the empty-input save flow
- Feature 6: Persist a separate retrieval embedding-model preset, but block retrieval with `409` / `code: "embedding_model_mismatch"` until it matches the active indexing preset so users manually reindex before switching embedding spaces

### Patterns & best practices
- Preserve current neutral defaults to minimize rollout surprise
- Keep UI strings in English
- Use commit-on-release interactions for the slider
- Keep the web and mobile settings screens aligned by reusing the shared core schema and preset catalogue
- Keep settings action rows visually consistent across panels by reusing shared layout classes in web settings UI

## Integration Points
**How do pieces connect?**

- Web settings panel loads and saves retrieval settings through the shared service
- Mobile settings panel loads and saves the same retrieval settings through the shared service contract
- Web search hook loads the same persisted settings and applies runtime slider commits
- `rag-search` receives numeric `topK` and threshold values derived from settings/UI
- `api-keys-status` and `api-keys-upsert` remain the primary settings transport layer unless implementation reveals a cleaner existing endpoint pattern
- API key management, indexing settings, and retrieval settings now intentionally share the same settings screen vocabulary and action layout
- `api-keys-upsert` now handles both key replacement and explicit key removal while continuing to preserve indexing/retrieval settings payloads
- `rag-search` now reads the active retrieval embedding preset from `user_rag_search_settings.embedding_model` instead of hardcoding `models/gemini-embedding-001`
- `rag-search` compares that preset to `user_rag_index_settings.embedding_model` before embedding the query
- On mismatch, `rag-search` returns `409 Conflict` with:
  - `code: "embedding_model_mismatch"`
  - `error: "Embedding model changed. Please reindex your notes to enable search."`
- Frontends should detect the mismatch with `response.status === 409` plus `body.code === "embedding_model_mismatch"`
- Web settings/search should show a proactive warning banner with the same copy and a `Reindex now` CTA that routes into the existing AI Index flow instead of waiting for a generic failure state
- Mobile settings should mirror the same warning copy and CTA so preset divergence is visible on both clients
- The full backend/frontend contract, stability guarantees, and extension rules for future mismatch codes are documented in [feature-rag-embedding-model-mismatch.md](../design/feature-rag-embedding-model-mismatch.md)

## Error Handling
**How do we handle failures?**

- Fall back to defaults if persisted retrieval settings are absent
- Show UI save/load errors similarly to existing settings panels
- Preserve existing Gemini failure handling, but treat embedding-model mismatch as a first-class warning state rather than a generic search error
- Exact mismatch copy:
  - `Embedding model changed. Please reindex your notes to enable search.`
- Mismatch severity:
  - warning in UI banners / inline alerts
  - warning-level server log event
- Reindex behavior:
  - manual only in this feature
  - triggered from a `Reindex now` CTA / prompt that routes to the existing AI Index workflow
  - no automatic background reindex on save and no hidden retry loop in `rag-search`
- Search surfaces should replace result content with the warning banner when the mismatch response is received; do not show a generic "try again later" message
- Settings surfaces should show inline helper text near the retrieval preset dropdown explaining that changing the preset pauses AI search until reindex completes
- Keep retrieval defaults on `models/gemini-embedding-001` so existing users do not change behavior until they opt into Gemini Embedding 2 (`models/gemini-embedding-2-preview`; canonical preset list lives in `core/rag/embeddingModels.ts`)
- Translate local service/network boot failures into a friendly settings-service message instead of surfacing raw resolution/runtime errors
- Keep read-only indexing/retrieval metadata visible by rendering default system values when live settings fail to load
- Follow the warning banner + `Reindex now` CTA contract from [feature-rag-embedding-model-mismatch.md](../design/feature-rag-embedding-model-mismatch.md) on both web and mobile

## Performance Considerations
**How do we keep it fast?**

- Do not fire network requests while the slider is moving
- Use `+1` overfetch instead of blind repeated empty `Load more` calls
- Keep retrieval settings payloads lightweight

## Security Notes
**What security measures are in place?**

- Retrieval settings are per-user and require authenticated access
- No additional secret handling is introduced
- Gemini task types and output dimensionality remain system-defined, not user-editable
- Gemini credentials continue to be stored encrypted, and explicit removal deletes the stored row instead of attempting a sentinel empty-string update
