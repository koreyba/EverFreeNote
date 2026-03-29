---
phase: implementation
title: Mobile RAG Retrieval Tuning UI
description: Implementation notes for mobile retrieval settings and AI search precision tuning
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Active branch: `feature-mobile-rag-retrieval-tuning-ui`
- Base docs lint passed before starting
- Dependency bootstrap:
  - root `npm ci` attempted but failed on Windows due a locked native module in `node_modules`
  - `ui/mobile` `npm ci` completed successfully
  - mobile implementation added `@react-native-community/slider`
  - mobile/shared Jest runtime also required `@babel/runtime` to load `core/*` imports during tests
- Continue using existing repository scripts for validation after implementation

## Code Structure
**How is the code organized?**

- Shared retrieval settings:
  - `core/rag/searchSettings.ts`
  - `core/services/ragSearchSettings.ts`
- Mobile search:
  - `ui/mobile/app/(tabs)/search.tsx`
  - `ui/mobile/hooks/useMobileSearchMode.ts`
  - `ui/mobile/hooks/useMobileAIPaginatedSearch.ts`
  - `ui/mobile/components/search/*`
- Mobile settings:
  - `ui/mobile/components/settings/ApiKeysSettingsPanel.tsx`
  - `ui/mobile/app/(tabs)/settings.tsx`

## Implementation Notes
**Key technical details to remember:**

### Core features
- Replace mobile preset-driven retrieval logic with shared persisted settings.
- Keep `isAIEnabled` and `viewMode` in mobile local state, but remove preset persistence.
- Persist `similarity_threshold` via `RagSearchSettingsService` on slider commit.
- Load `topK` and read-only retrieval metadata into the mobile settings panel.
- Keep Gemini key save/remove on the same settings screen and invalidate `apiKeysStatus` queries after successful saves.
- Expose raw AI chunks in mobile chunk view instead of flattening only two grouped note chunks.

### Patterns & Best Practices
- Follow the web feature’s product semantics, but keep mobile-native layout and controls.
- Prefer shared core constants/defaults over mobile-local retrieval constants where equivalent.
- Keep fallback/default rendering when settings fail to load.

## Integration Points
**How do pieces connect?**

- Mobile settings/search load retrieval settings via `api-keys-status`
- Mobile settings persist retrieval settings via `api-keys-upsert`
- Mobile AI search invokes `rag-search` with numeric `topK` and `threshold`
- Mobile search note mode internally overfetches chunk windows until it can fill the requested note page or prove there are no more note groups

## Error Handling
**How do we handle failures?**

- Show friendly settings error messages while still rendering defaults.
- Keep Gemini key failures isolated from retrieval settings rendering where possible.
- Avoid firing AI search while settings are still unresolved if the final values matter to the request.
- Keep precision save rollback behavior request-aware so a stale slider response does not overwrite a newer value.

## Performance Considerations
**How do we keep it fast?**

- Keep slider updates local and refetch only on commit.
- Preserve FlashList usage in mobile search results.
- Avoid unnecessary re-renders when toggling AI mode and view mode.

## Security Notes
**What security measures are in place?**

- Retrieval settings remain per-user and server-backed.
- Gemini API key handling stays in the existing encrypted backend flow.
