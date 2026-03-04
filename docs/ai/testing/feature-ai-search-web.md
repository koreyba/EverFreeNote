---
phase: testing
title: AI Search Web (RAG) — Testing Strategy
description: Unit, integration, and E2E test strategy for semantic search UI
---

# Testing Strategy

## Test Coverage Goals

- **Unit tests**: 100% of new code in `core/`, `hooks/`, and pure utility functions
- **Integration tests**: `rag-search` Edge Function (mocked Gemini + real pgvector), `useAISearch` hook with mocked fetch
- **E2E tests**: Key user journeys through the AI Search UI

## Unit Tests

### `core/constants/aiSearch.ts` — `sliderToParams`
- [ ] `sliderToParams(0)` returns strict anchors (`topK: 5, threshold: 0.75`)
- [ ] `sliderToParams(100)` returns broad anchors (`topK: 30, threshold: 0.40`)
- [ ] `sliderToParams(50)` returns neutral anchors
- [ ] Values between 0–50 interpolate correctly between strict and neutral
- [ ] Values between 50–100 interpolate correctly between neutral and broad

### `useAISearch` — deduplication logic
- [ ] Chunks within `OFFSET_DELTA_THRESHOLD` of an accepted chunk are filtered out
- [ ] Chunks beyond offset threshold are accepted
- [ ] Output is capped at `maxCount` (5 for Note View)
- [ ] `hiddenCount` equals total input minus accepted count
- [ ] Empty input returns `{ accepted: [], hiddenCount: 0 }`
- [ ] Single chunk input always accepted

### `useAISearch` — groupByNote
- [ ] Chunks from same note are grouped together
- [ ] Groups sorted by `topScore` descending
- [ ] Each group contains deduplicated chunks only
- [ ] Multiple notes each get their own group

### `useSearchMode`
- [ ] Default state: `isAIEnabled: false`, `viewMode: 'note'`
- [ ] Toggle persisted to localStorage
- [ ] View mode change persisted to localStorage
- [ ] Reads from localStorage on init

### `AiSearchSlider`
- [ ] Renders with label "Strict" on left, "Broad" on right
- [ ] `onChange` fires with correct slider value
- [ ] Slider is disabled when AI Search is OFF
- [ ] Accessible: has ARIA label and `role="slider"`

### `NoteSearchItem`
- [ ] Renders note title, tags, and top score
- [ ] Shows exactly 1 chunk snippet by default
- [ ] "Show more" button not rendered if `chunks.length <= 1`
- [ ] Clicking "Show more" expands to show all `chunks`
- [ ] "+N hidden" label shown when `hiddenCount > 0`
- [ ] "+N hidden" not shown when `hiddenCount === 0`

### `ChunkSearchItem`
- [ ] Renders note title, chunk content, similarity score
- [ ] "Open in context" button rendered
- [ ] Clicking "Open in context" fires callback with `{ noteId, charOffset }`

### `ChunkSearchResults`
- [ ] Renders max 2 chunks per note
- [ ] Chunks beyond 2 per note are not rendered

## Integration Tests

- [ ] `useAISearch` — calls `rag-search` Edge Function with correct `{ query, topK, threshold, userId }`
- [ ] `useAISearch` — does NOT call Edge Function when `isEnabled = false`
- [ ] `useAISearch` — does NOT call Edge Function when `query.length < 3`
- [ ] `useAISearch` — debounces: only 1 call for rapid keystrokes within 300ms
- [ ] `useAISearch` — maps raw chunks to `RagNoteGroup[]` correctly
- [ ] `useAISearch` — returns `isLoading: true` while fetch in progress
- [ ] `useAISearch` — returns `error` when Edge Function returns 5xx
- [ ] `Sidebar` integration — FTS results hidden when AI Search is ON
- [ ] `Sidebar` integration — AI controls (toggle, slider, tabs) hidden when AI is OFF

### `rag-search` Edge Function (Deno / local Supabase)
- [ ] Returns 401 when called without auth token
- [ ] Returns `{ chunks: [] }` for query with no matching embeddings
- [ ] Enriches chunks with `noteTitle` and `noteTags` from `notes` table
- [ ] Applies `threshold` filter: chunks below threshold not returned
- [ ] Respects `topK` limit: at most `topK` chunks returned
- [ ] Reads Gemini API key from `user_api_keys` (mocked Gemini call)
- [ ] Returns error JSON when Gemini key is missing

## End-to-End Tests

- [ ] **E2E-1**: Toggle AI Search ON → search box query triggers AI results, FTS results disappear
- [ ] **E2E-2**: Toggle AI Search OFF → FTS results return, AI components hidden
- [ ] **E2E-3**: Note View — results show note title, tag, score, and 1 snippet
- [ ] **E2E-4**: Note View — "Show more" expands to additional snippets; "+N hidden" visible if applicable
- [ ] **E2E-5**: Switch to Chunk View — each result shows note title, chunk text, "Open in context"
- [ ] **E2E-6**: Chunk View — max 2 chunks visible per note
- [ ] **E2E-7**: Slider moved to Strict → fewer results returned
- [ ] **E2E-8**: "Open in context" — note opens in editor and scrolls to highlighted region
- [ ] **E2E-9**: AI Search mode and view mode persist after page reload

## Test Data

- At least 3 notes with content indexed in `note_embeddings`
- Notes should contain overlapping topics to test deduplication and grouping
- Mock `rag-search` response fixtures in `__fixtures__/ragSearch.ts`:
  ```typescript
  export const mockRagChunks: RagChunk[] = [...]
  export const mockRagNoteGroups: RagNoteGroup[] = [...]
  ```

## Manual Testing

- [ ] Toggle ON/OFF is clearly visible and the state is obvious
- [ ] Slider thumb is draggable and snaps smoothly
- [ ] Score badges are readable (contrast ratio ≥ 4.5:1)
- [ ] Highlighted chunk in editor is visible without being distracting
- [ ] "Open in context" works for notes already open in editor (same note)
- [ ] Works in Firefox, Chrome, Safari (desktop)

## Performance Testing

- [ ] AI Search with 1000+ indexed chunks returns within 2s on average connection
- [ ] Chunk View with 30+ items renders without jank (no dropped frames)

## Bug Tracking

- Report AI Search-specific issues with label `ai-search` in the tracker
- Regression: after any sidebar change, verify FTS still works when AI is OFF
