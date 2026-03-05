---
phase: testing
title: AI Search Web (RAG) - Testing Strategy
description: Detailed test catalog for AI search retrieval, UI behavior, and context navigation
---

# Testing Strategy

## Objective

Define complete test coverage for AI Search on web, including:
- Retrieval behavior via `rag-search`
- Client-side grouping, deduplication, and pagination
- AI mode UX (toggle, presets, tabs, Enter-triggered search)
- Editor context navigation (`Open in context`)
- Robustness under errors, empty states, and partial index coverage

## Scope

In scope:
- `useAIPaginatedSearch`, `useSearchMode`, `AiSearch*` components
- `SearchResultsPanel` AI paths (Notes and Chunks)
- `rag-search` edge function contract
- API key gating and tooltip behavior

Out of scope:
- Mobile native app
- AI ranking quality as an ML metric

## Test Priority Model

- `P0`: data correctness, query contract, user-critical flows
- `P1`: major UX behavior and interaction consistency
- `P2`: polish and non-critical presentation behavior

## Automated Test Catalog

### A) Constants and pure logic

- [ ] `P0` `AIS-CONST-001`: preset mapping is exact (`strict`, `neutral`, `broad`) with expected `topK` and `threshold`.
- [ ] `P0` `AIS-LOGIC-001`: chunk dedup accepts first highest-similarity chunk and removes close offsets.
- [ ] `P0` `AIS-LOGIC-002`: dedup keeps max chunks per note and computes `hiddenCount` correctly.
- [ ] `P0` `AIS-LOGIC-003`: `groupByNote` sorts groups by `topScore` descending.
- [ ] `P1` `AIS-LOGIC-004`: group signature detects changes in score/snippet content, not only ids.

### B) `useAIPaginatedSearch`

- [ ] `P0` `AIS-HOOK-001`: disabled when query shorter than minimum.
- [ ] `P0` `AIS-HOOK-002`: query key includes query/preset/tag/topK dimensions.
- [ ] `P0` `AIS-HOOK-003`: load-more increases requested topK and preserves dedup semantics.
- [ ] `P0` `AIS-HOOK-004`: cumulative fetch refreshes existing groups when better chunks/scores arrive.
- [ ] `P0` `AIS-HOOK-005`: `aiHasMore` transitions correctly by chunk count and max topK boundary.
- [ ] `P0` `AIS-HOOK-006`: `resetAIResults()` clears offset and accumulated results.
- [ ] `P1` `AIS-HOOK-007`: changing search identity (query/preset/tag/enabled) resets pagination state.
- [ ] `P1` `AIS-HOOK-008`: exposes loading and error states for UI consumption.

### C) `useSearchMode`

- [ ] `P1` `AIS-MODE-001`: default values are stable (`isAIEnabled=false`, default preset, default view mode).
- [ ] `P1` `AIS-MODE-002`: toggle/preset/view persist to localStorage.
- [ ] `P1` `AIS-MODE-003`: values restore from localStorage on initialization.

### D) AI controls components

- [ ] `P1` `AIS-COMP-001`: `AiSearchToggle` disabled when API key missing.
- [ ] `P1` `AIS-COMP-002`: missing-key tooltip message is rendered.
- [ ] `P1` `AIS-COMP-003`: blocked-selection hint (`Remove selection to switch`) opens on desktop hover.
- [ ] `P1` `AIS-COMP-004`: blocked-selection hint toggles on mobile tap and closes on outside tap.
- [ ] `P1` `AIS-COMP-005`: info tooltip on mobile does not auto-close immediately.
- [ ] `P1` `AIS-COMP-006`: `AiSearchViewTabs` disabled behavior mirrors toggle behavior.
- [ ] `P2` `AIS-COMP-007`: preset selector updates active preset styling and callback payload.

### E) AI results rendering components

- [ ] `P0` `AIS-UI-001`: `NoteSearchResults` empty state renders when no groups.
- [ ] `P0` `AIS-UI-002`: `NoteSearchItem` renders title/tags/score/top snippet.
- [ ] `P1` `AIS-UI-003`: fragment expansion shows additional chunks and hidden fragment count.
- [ ] `P1` `AIS-UI-004`: in selection mode, chunk click toggles selection and does not open context.
- [ ] `P0` `AIS-UI-005`: `ChunkSearchResults` shows chunk rows and calls `onOpenInContext` with correct payload.
- [ ] `P1` `AIS-UI-006`: chunk view respects per-note chunk cap in UI.

### F) `SearchResultsPanel` AI-path integration

- [ ] `P0` `AIS-PANEL-001`: AI mode ON + Enter triggers AI query path.
- [ ] `P0` `AIS-PANEL-002`: AI mode ON + typing without Enter does not trigger AI query.
- [ ] `P0` `AIS-PANEL-003`: AI mode OFF keeps FTS behavior.
- [ ] `P0` `AIS-PANEL-004`: Notes/Chunks tabs switch rendering path correctly.
- [ ] `P0` `AIS-PANEL-005`: load-more in AI Notes calls `controller.loadMoreAI` and appends results.
- [ ] `P1` `AIS-PANEL-006`: AI error state renders retry action and retry calls refetch.
- [ ] `P1` `AIS-PANEL-007`: active tag filter is forwarded to AI query function.
- [ ] `P1` `AIS-PANEL-008`: clear search resets AI results and exits panel selection mode.

### G) Edge function contract (`rag-search`)

- [ ] `P0` `AIS-EDGE-001`: unauthorized request fails with auth error.
- [ ] `P0` `AIS-EDGE-002`: valid request returns `chunks[]` shape with required fields.
- [ ] `P0` `AIS-EDGE-003`: threshold filter removes chunks below threshold.
- [ ] `P0` `AIS-EDGE-004`: `topK` cap enforced.
- [ ] `P0` `AIS-EDGE-005`: `filterTag` constrains results to notes containing tag.
- [ ] `P0` `AIS-EDGE-006`: missing Gemini key returns controlled error response.
- [ ] `P1` `AIS-EDGE-007`: note title and tags enrichment is present in output.

### H) Open-in-context integration

- [ ] `P0` `AIS-CTX-001`: clicking `Open in context` opens target note and calls scroll with mapped offsets.
- [ ] `P0` `AIS-CTX-002`: if note not in loaded sidebar pages, fallback fetch retrieves it and opens editor.
- [ ] `P1` `AIS-CTX-003`: pending scroll executes after editor mount/create lifecycle.
- [ ] `P1` `AIS-CTX-004`: highlight decoration appears and clears on next user click.

### I) Persistence and regressions

- [ ] `P1` `AIS-REG-001`: AI enabled state and selected view/preset survive reload.
- [ ] `P0` `AIS-REG-002`: with AI ON and empty/unsubmitted query, app shows regular notes list.
- [ ] `P1` `AIS-REG-003`: toggling AI OFF restores expected FTS interaction flow.
- [ ] `P1` `AIS-REG-004`: query+tag behavior stays stable after preset changes.

## Manual Test Catalog

- [ ] `P0` `AIS-MAN-001`: full user flow: enable AI -> Enter query -> open note in context.
- [ ] `P0` `AIS-MAN-002`: no-results and error states are visually clear and recoverable.
- [ ] `P1` `AIS-MAN-003`: desktop and mobile tooltip interactions are stable.
- [ ] `P1` `AIS-MAN-004`: browser matrix smoke (Chrome, Safari, Firefox desktop).
- [ ] `P2` `AIS-MAN-005`: keyboard navigation for AI controls and result actions.

## Performance and Load

- [ ] `P1` `AIS-PERF-001`: AI query perceived latency is acceptable under normal network.
- [ ] `P1` `AIS-PERF-002`: load-more stays responsive with larger result sets.
- [ ] `P2` `AIS-PERF-003`: repeated same-query refetch avoids unnecessary UI churn.

## Suggested Execution Order

1. Run all `P0` hook and edge-contract tests.
2. Run `P0` panel and open-in-context integration tests.
3. Run `P1` interaction, persistence, and performance smoke tests.
4. Execute manual browser/device checks.

## Exit Criteria

AI Search test scope is considered complete when:
- All `P0` automated tests pass.
- No unresolved `P1` regressions in target browsers.
- Manual `P0` scenarios are documented as verified.
