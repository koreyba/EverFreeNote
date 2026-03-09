---
phase: testing
title: RAG Search on Mobile - Testing Strategy
description: Test plan for mobile AI search parity, chunk open-in-context, and result-list behavior
note: This file was created by copying the testing template from docs/ai/testing/README.md and tailoring it for this feature.
---

# Testing Strategy

## Unit Tests

### `useMobileSearchMode`
- [ ] Loads default state when no persisted value exists
- [ ] Restores persisted `isAIEnabled`, `preset`, and `viewMode`
- [ ] Persists changes after toggling mode or switching view/preset
- [ ] Sanitizes invalid persisted values back to supported defaults

### `useMobileAIPaginatedSearch`
- [ ] Does not fetch below `AI_SEARCH_MIN_QUERY_LENGTH`
- [ ] Calls `rag-search` with preset-derived `topK` and `threshold`
- [ ] Groups returned chunks by note
- [ ] Deduplicates chunks that are too close in offset
- [ ] Replaces accumulated results when cumulative `topK` grows
- [ ] Resets accumulated results when query/preset/tag changes
- [ ] Exposes correct `aiHasMore` and `aiLoadingMore` behavior

### Search result components
- [ ] Note result card renders title, tags, snippet, and score correctly
- [ ] Chunk result card renders note title, chunk snippet, and score correctly
- [ ] Long press selection handlers exist only for note-style cards
- [ ] Disabled controls expose blocked state when selection mode is active

### Editor bridge
- [ ] `EditorWebView.scrollToChunk()` posts the expected message
- [ ] note screen converts title-prefixed offsets to body-relative offsets
- [ ] pending chunk focus waits for editor readiness before dispatch

## Integration Tests

- [ ] AI toggle activates AI mode and suppresses regular search fetches
- [ ] Switching back to regular mode suppresses AI fetches
- [ ] Notes/chunks tab switch updates the rendered result list
- [ ] Selection mode blocks AI toggle and view switching
- [ ] Long press selection works in notes view
- [ ] Chunk view does not allow note selection
- [ ] AI result tap opens the note with chunk-focus params
- [ ] Regular search pagination remains functional after the refactor
- [ ] AI pagination loads more results on scroll/end reached

## End-to-End / Manual QA Checklist

- [ ] Search screen still loads and regular search works with no AI interaction
- [ ] Enabling AI search immediately switches the active search mode
- [ ] `Strict`, `Neutral`, and `Broad` produce visibly different recall behavior
- [ ] Notes view shows grouped note matches
- [ ] Chunks view shows direct fragment matches
- [ ] Tapping an AI result opens the correct note
- [ ] Note editor scrolls to the matching chunk
- [ ] Focused chunk shows green left highlight
- [ ] Tapping inside the editor clears the highlight
- [ ] Long press note selection still works in note-style result lists
- [ ] While selection mode is active, AI toggle and notes/chunks tabs are blocked
- [ ] Large result sets remain smooth while scrolling and paginate correctly

## Test Coverage Results

| Component | Coverage % | Lines Covered / Total | Last updated |
|-----------|------------|-----------------------|--------------|
| `useRagStatus` | TBD | TBD / TBD | 2026-03-09 |
| `NoteIndexMenu` | TBD | TBD / TBD | 2026-03-09 |
| `GeminiApiKeySection` | TBD | TBD / TBD | 2026-03-09 |
| `useMobileSearchMode` | TBD | TBD / TBD | 2026-03-09 |
| `useMobileAIPaginatedSearch` | TBD | TBD / TBD | 2026-03-09 |

## Outstanding Gaps

### Unit Test Gaps
- Exact visual score styling thresholds may remain covered only indirectly unless dedicated component tests are added.
- AsyncStorage recovery from malformed JSON should be explicitly tested if persistence logic grows more complex.

### Integration Test Gaps
- Full scroll-to-chunk behavior inside the real WebView may still need higher-level verification beyond mocked bridge tests.
- Very large AI result sets should be stress-tested with representative fixtures, not only small mocked pages.

### Manual QA Gaps
- Device-level validation is still needed on at least one Android handset for WebView scroll and highlight clearing.
- Manual UX verification is needed for disabled-control messaging during selection mode.
