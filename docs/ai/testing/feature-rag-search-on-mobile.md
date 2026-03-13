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

## Coverage-Driven Test Cases Added

### Added on 2026-03-13
- [x] `useOpenNote` opens a plain note route when no chunk focus is provided
- [x] `useOpenNote` seeds the note cache with the freshest cached note before navigating
- [x] `useOpenNote` generates a stable fallback `focusRequestId` when one is not supplied
- [x] `useMobileAIPaginatedSearch` skips requests below the minimum AI query length
- [x] `useMobileAIPaginatedSearch` keeps `aiHasMore` true when `availableChunkCount` exceeds the filtered chunk payload
- [x] `useMobileAIPaginatedSearch` clears accumulated results immediately when the authenticated user changes
- [x] `EditorWebView` queues `scrollToChunk()` until `READY`
- [x] `EditorWebView` sends `scrollToChunk()` immediately after readiness is established
- [x] `AiSearchNoteCard` opens the top fragment in context
- [x] `AiSearchNoteCard` toggles selection instead of navigating while selection mode is active
- [x] `AiSearchNoteCard` distinguishes hidden-only matches from expandable extra fragments
- [x] `AiSearchChunkCard` opens the note in context with the selected chunk payload
- [x] `AiSearchChunkCard` renders tags and forwards tag presses
- [x] `SearchResultsList` renders empty state when no rows exist
- [x] `SearchResultsList` handles regular-note selection activation and selection-mode toggling
- [x] `SearchResultsList` flattens AI chunk rows to the top two chunks per note
- [x] `SearchResultsList` gates `onLoadMore` when already loading and fires it when pagination is allowed
- [x] `chunkFocusUtils` returns `false` when no text block overlaps the requested chunk
- [x] `chunkFocusUtils` scrolls via the nearest scroll parent when one exists
- [x] `chunkFocusUtils` falls back to `scrollIntoView()` when no scroll parent exists
- [x] `RichTextEditorWebView` buffers `scrollToChunk()` until `onCreate`
- [x] `RichTextEditorWebView` forwards imperative commands and content replacement to the editor instance

## Test Coverage Results

Coverage note: metrics below were measured on 2026-03-13 against the current branch with targeted coverage runs for the mobile AI-search scope and the web chunk-focus utility scope.

| Component | Coverage % | Lines Covered / Total | Last updated |
|-----------|------------|-----------------------|--------------|
| Mobile targeted scope (aggregate) | 92.58% lines / 90.83% statements / 76.49% branches | 512 / 553 lines | 2026-03-13 |
| `useMobileSearchMode` | 98.24% lines | 56 / 57 lines | 2026-03-13 |
| `useMobileAIPaginatedSearch` | 97.43% lines | 76 / 78 lines | 2026-03-13 |
| `useOpenNote` | 100.00% lines | 11 / 11 lines | 2026-03-13 |
| `EditorWebView` chunk focus bridge | 83.42% lines | 151 / 181 lines | 2026-03-13 |
| `AiSearchChunkCard` | 100.00% lines | 7 / 7 lines | 2026-03-13 |
| `AiSearchNoteCard` | 100.00% lines | 28 / 28 lines | 2026-03-13 |
| `SearchResultsList` | 100.00% lines | 31 / 31 lines | 2026-03-13 |
| Web targeted scope (aggregate) | 65.60% lines / 62.43% statements / 41.45% branches | 227 / 346 lines | 2026-03-13 |
| `chunkFocusUtils` | 100.00% lines | 61 / 61 lines | 2026-03-13 |
| `RichTextEditorWebView` | 73.13% lines | 49 / 67 lines | 2026-03-13 |
| `RichTextEditor` | 0.00% lines | 0 / 69 lines | 2026-03-13 |

## Outstanding Gaps

### Unit Test Gaps
- `EditorWebView` still has uncovered fallback/error branches and some connectivity/theme synchronization paths beyond the imperative bridge coverage.
- `RichTextEditorWebView` still has shallow branch coverage around paste handling, selection updates, and focus/blur callbacks.
- `RichTextEditor` remains unmeasured and still needs either focused unit tests or a higher-level editor harness.

### Integration Test Gaps
- Full scroll-to-chunk behavior still needs an end-to-end assertion inside the real mobile WebView, not only the mocked bridge.
- Very large AI result sets still need stress coverage for virtualization and repeated `onEndReached` loading.
- Search-mode switching under fast repeated toggles is only partially covered through current happy-path integration tests.

### Manual QA Gaps
- Device-level validation is still needed on at least one Android handset for WebView scroll and highlight clearing.
- Manual UX verification is still needed for disabled-control messaging during selection mode.
- Search screen parity should still be checked visually between regular and AI notes/chunks results after the card unification changes.
