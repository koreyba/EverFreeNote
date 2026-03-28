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
- [ ] Test case 1: resolves defaults when no stored row exists
- [ ] Test case 2: validates `top_k` bounds and integer requirement
- [ ] Test case 3: validates `similarity_threshold` numeric bounds
- [ ] Additional coverage: read-only settings remain fixed and exposed correctly

### Web search hooks / UI state
- [ ] Test case 1: slider draft value changes without firing search
- [ ] Test case 2: slider commit persists the new threshold and fires a single new search only when value changed
- [ ] Test case 3: persisted `topK` controls page size and `Load more` increment size
- [ ] Additional coverage: removing preset state does not break stored search-mode loading

## Integration Tests
**How do we test component interactions?**

- [ ] `api-keys-status` returns `ragSearch` alongside existing settings payloads
- [ ] `api-keys-upsert` persists retrieval settings without regressing Gemini/indexing updates
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

- Run targeted unit/integration suites for core and web changes
- Record any remaining gaps in this doc during implementation
- Capture manual web QA outcomes for slider behavior and `Load more`

## Manual Testing
**What requires human validation?**

- Slider usability and English copy clarity
- Search rerun timing on slider release
- `Load more` disappearance after the last page
- Settings persistence across refresh and sign-in

## Performance Testing
**How do we validate performance?**

- Verify slider dragging does not flood network requests
- Verify `Load more` continues to feel responsive with `+1` overfetch

## Bug Tracking
**How do we manage issues?**

- Track any regression in AI search quality relative to the old neutral preset
- Treat incorrect `hasMore` state and unintended repeated refetching as release-blocking bugs
