---
phase: testing
title: RAG Retrieval Tuning UI
description: Testing strategy for persisted retrieval settings, precision slider behavior, and `Load more` pagination
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% of new or changed core/web logic where practical
- Integration coverage: settings load/save plus `rag-search` pagination behavior
- End-to-end coverage: key AI search flows in web UI
- Regression coverage: existing indexing and AI search behavior remains intact

## Unit Tests
**What individual components need testing?**

### Shared retrieval settings module
- [x] Test case 1: resolves defaults when no stored row exists
- [x] Test case 2: validates `top_k` bounds and integer requirement
- [x] Test case 3: validates `similarity_threshold` numeric bounds
- [x] Additional coverage: read-only settings remain fixed and exposed correctly
  - Covered by `core/tests/unit/core-rag-searchSettings.test.ts`

### Web search hooks / UI state
- [ ] Test case 1: slider draft value changes without firing search
- [ ] Test case 2: slider commit persists the new threshold and fires a single new search only when value changed
- [x] Test case 3: persisted `topK` controls page size and `Load more` increment size
- [x] Additional coverage: removing preset state does not break stored search-mode loading
  - Covered by `ui/web/tests/unit/hooks/useAIPaginatedSearch.test.tsx`
  - Covered by `ui/web/tests/unit/hooks/useSearchMode.test.tsx`

### Settings panels and API key actions
- [x] Test case 1: retrieval settings panel still renders default system values when live settings fail to load
- [x] Test case 2: indexing settings panel still renders default system values when live settings fail to load
- [x] Test case 3: API key panel keeps `Remove key` disabled until a Gemini key is configured
- [x] Test case 4: explicit `removeGeminiApiKey` action is sent through the settings service
- [x] Test case 5: indexing and retrieval settings panels persist the selected embedding-model preset through the shared settings services
- [x] Additional coverage: removing a configured Gemini key from the settings panel updates the UI state
  - Covered by `ui/web/tests/unit/components/settingsPanels.test.tsx`
  - Covered by `core/tests/unit/core-services-apiKeysSettings.test.ts`
  - Covered by `ui/mobile/tests/unit/settingsPanels.test.tsx`

## Integration Tests
**How do we test component interactions?**

- [ ] `api-keys-status` returns `ragSearch` alongside existing settings payloads
- [ ] `api-keys-upsert` persists retrieval settings without regressing Gemini/indexing updates
- [ ] Edge functions keep reading legacy settings rows while `embedding_model` is not yet migrated
- [ ] `rag-search` uses the retrieval-side embedding-model preset and `rag-index` uses the indexing-side preset
- [ ] `rag-search` overfetches by one and returns an exact `hasMore`
- [ ] Search results panel hides `Load more` when `hasMore` is false

## End-to-End Tests
**What user flows need validation?**

- [ ] User updates `topK` in Settings, refreshes, and sees the value persist
- [ ] User performs AI search, drags precision slider, and search reruns only on release while the committed threshold persists after refresh
- [ ] User loads additional results until `Load more` disappears
- [ ] Regression of standard AI search when the user never changes retrieval settings

## Test Data
**What data do we use for testing?**

- Indexed notes with a mix of strong, medium, and weak semantic matches
- At least one dataset where more than one page of chunk results exists
- A user account with no custom retrieval settings row to confirm defaults

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Targeted automated checks completed on 2026-04-11:
  - `npx jest --config jest.config.cjs --selectProjects unit-core unit-web --runTestsByPath core/tests/unit/core-rag-searchSettings.test.ts core/tests/unit/core-services-ragSettings.test.ts core/tests/unit/core-services-apiKeysSettings.test.ts ui/web/tests/unit/components/settingsPanels.test.tsx`
  - `npm test -- settingsPanels.test.tsx --runInBand` (from `ui/mobile`)
  - `npm run type-check`
  - `npm run type-check` (from `ui/mobile`)
  - `npm run deno-check`
- Result: all executed checks passed.
- Remaining gaps:
  - no automated integration test yet for `api-keys-status` / `api-keys-upsert` retrieval payloads
  - no automated web component test yet for slider commit persistence
  - no manual QA results recorded yet for the final mobile/light/dark settings-page polish pass

## Manual Testing
**What requires human validation?**

- Slider usability and English copy clarity
- Search rerun timing on slider release
- `Load more` disappearance after the last page
- Settings persistence across refresh and sign-in
- Final responsive pass for the updated settings action rows in light and dark themes

## Performance Testing
**How do we validate performance?**

- Verify slider dragging does not flood network requests
- Verify `Load more` continues to feel responsive with `+1` overfetch

## Bug Tracking
**How do we manage issues?**

- Track any regression in AI search quality relative to the old neutral preset
- Treat incorrect `hasMore` state and unintended repeated refetching as release-blocking bugs
