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
- Existing indexing-related modules stay unchanged unless they need read-only display reuse

## Implementation Notes
**Key technical details to remember:**

### Core features
- Feature 1: Add a shared retrieval-settings module similar to indexing settings
- Feature 2: Extend the status/upsert settings flow with a new `ragSearch` payload
- Feature 3: Update web AI search to use:
  - persisted `topK`
  - committed persisted similarity threshold
  - backend-provided `hasMore`

### Patterns & best practices
- Preserve current neutral defaults to minimize rollout surprise
- Keep UI strings in English
- Use commit-on-release interactions for the slider
- Keep mobile reuse in mind, but do not add mobile UI in this feature

## Integration Points
**How do pieces connect?**

- Web settings panel loads and saves retrieval settings through the shared service
- Web search hook loads the same persisted settings and applies runtime slider commits
- `rag-search` receives numeric `topK` and threshold values derived from settings/UI
- `api-keys-status` and `api-keys-upsert` remain the primary settings transport layer unless implementation reveals a cleaner existing endpoint pattern

## Error Handling
**How do we handle failures?**

- Fall back to defaults if persisted retrieval settings are absent
- Show UI save/load errors similarly to existing settings panels
- Preserve existing `rag-search` error handling and avoid changing Gemini behavior

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
