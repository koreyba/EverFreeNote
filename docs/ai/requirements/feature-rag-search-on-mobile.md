---
phase: requirements
title: RAG Search on Mobile - Requirements & Problem Understanding
description: Bring the web AI search experience to the React Native mobile app while preserving existing mobile search and note workflows
---

# Requirements & Problem Understanding

## Problem Statement

Mobile already supports traditional note search and note-level RAG indexing, but it still lacks the actual AI search experience available on the web. This creates a parity gap for users who index notes on mobile yet cannot run semantic search there.

The missing piece is not just a button or backend call. Mobile needs the same search model as web:
- regular FTS search and AI search as mutually exclusive modes
- AI result views for both note groups and individual chunks
- three search strictness presets
- open-in-context navigation from AI results into the note editor
- selection-mode rules that match the current web behavior
- virtualized, incremental loading so large result sets stay responsive

## Goals & Objectives

### Primary Goals
1. Add mobile AI search mode with the same semantic search logic as web.
2. Support two AI result views:
   - `notes`
   - `chunks`
3. Support three strictness presets:
   - `strict`
   - `neutral`
   - `broad`
4. Make AI and regular search mutually exclusive so only the active mode fetches.
5. Open AI results in note context:
   - navigate to the note
   - scroll to the matching chunk
   - show a green left highlight line on the focused chunk
   - clear that highlight when the user taps in the editor
6. Preserve long-press bulk selection in `notes` view only.
7. While selection mode is active, block:
   - switching between `notes` and `chunks`
   - switching between regular search and AI search
8. Keep large result sets fast with virtualization and incremental loading for both regular and AI search.
9. Unify the visual presentation of search result cards between regular and AI search.

### Secondary Goals
- Persist AI search mode preferences on mobile so the chosen mode, preset, and view feel stable.
- Reuse shared constants and types (`SearchPreset`, `RagChunk`, `RagNoteGroup`) rather than inventing mobile-only variants.
- Keep existing search history and tag-filter behavior compatible with the new search experience.

## Non-Goals

- Changing backend ranking logic for `rag-search`
- Changing the chunking/indexing pipeline
- Adding selection mode to AI `chunks` view
- Building a mobile-only AI search design that intentionally diverges from web behavior
- Replacing the current note editor with a native editor

## User Stories & Use Cases

| ID | Story |
|----|-------|
| US-1 | As a mobile user, I want to switch from regular search to AI search so I can run semantic queries from my phone. |
| US-2 | As a mobile user, I want to choose `strict`, `neutral`, or `broad` AI search so I can control recall vs precision. |
| US-3 | As a mobile user, I want to switch between `notes` and `chunks` views so I can browse grouped note matches or direct fragments. |
| US-4 | As a mobile user, I want tapping an AI result to open the note at the matching chunk so I do not have to hunt manually. |
| US-5 | As a mobile user, I want the matched chunk visually highlighted in the editor so I can quickly orient myself. |
| US-6 | As a mobile user, I want long-press note selection to keep working in search results, but only where it makes sense. |
| US-7 | As a mobile user, I want the UI to block mode/view switching during selection so I do not lose track of what is selected. |
| US-8 | As a mobile user with many indexed notes, I want AI results to load incrementally and stay smooth while scrolling. |

## Functional Requirements

### Search Modes
- The search screen must expose a toggle between regular search and AI search.
- Toggling must immediately activate the selected mode.
- Only the active mode may fetch or paginate.
- Search history remains tied to the typed query and should not break with AI mode enabled.

### AI Search Controls
- AI mode must show the three strictness presets from `@core/constants/aiSearch`.
- AI mode must show `notes` and `chunks` result views.
- View switching is allowed only when selection mode is not active.

### Result Views
- `notes` view must group chunks by note, matching web grouping and dedup rules.
- `chunks` view must flatten grouped results into chunk cards, matching web limits and ordering.
- Only `notes` view supports selection mode.

### Open In Context
- Tapping an AI result in either view must open the note editor.
- The navigation payload must include enough data to resolve the matching chunk.
- Because indexed content includes the title prefix, mobile must apply the same title-offset adjustment as web before scrolling.
- The editor must scroll to the target chunk and decorate the relevant blocks with a green left accent line.
- The highlight must clear on user interaction inside the editor.

### Performance
- AI results must use virtualization/incremental loading rather than rendering everything at once.
- AI pagination must behave cumulatively like web `useAIPaginatedSearch`, replacing the visible result set with refreshed ranked groups when `topK` grows.
- Regular search virtualization must remain intact.

## Edge Cases

- User enables AI search without a configured Gemini key: toggle can be shown but AI results should fail clearly and recover cleanly.
- Query is below `AI_SEARCH_MIN_QUERY_LENGTH`: AI mode should not fetch and should show the idle/empty guidance state.
- User switches notes quickly after tapping different AI results: only the latest chunk focus request should apply.
- Note is not currently in local search results: app must still fetch/open that note if needed for AI open-in-context.
- Selection mode active: AI toggle and view tabs must be visibly blocked, not silently ignored.
- Chunk highlight request arrives before the editor WebView is ready: it must queue and apply once ready.

## Success Criteria

- [ ] Mobile search supports both regular and AI search modes.
- [ ] AI mode supports `notes` and `chunks` views.
- [ ] AI mode supports `strict`, `neutral`, and `broad` presets.
- [ ] Only the active search mode fetches.
- [ ] Switching the AI toggle immediately activates the selected search type.
- [ ] Long-press selection works only in note-style result lists.
- [ ] Selection mode blocks AI toggle and AI view switching.
- [ ] AI result tap opens the note, scrolls to the matching chunk, and highlights it.
- [ ] Chunk highlight clears when the user taps in the editor.
- [ ] AI result rendering is virtualized/incremental and remains responsive with large datasets.
- [ ] Regular and AI note cards share a unified visual language.

## Constraints & Assumptions

### Technical Constraints
- Mobile app uses React Native + Expo Router.
- Mobile Supabase provider exposes `client`, not `supabase`.
- The embedded editor is driven through `EditorWebView` and the web `editor-webview` page bridge.
- Shared RAG search constants/types already exist in `core`.

### Assumptions
- `rag-search` Edge Function is already deployed and compatible with mobile auth.
- Existing web grouping/dedup logic is the source of truth for AI notes/chunks behavior.
- The mobile search screen may be refactored structurally as long as existing non-AI flows remain correct.

## Questions & Open Items

| # | Question | Status |
|---|----------|--------|
| Q1 | Should mobile AI search run on debounced typing or explicit Enter/submit only? | Resolved: mobile should activate the currently selected mode immediately from the search field interaction pattern, without requiring a separate web-style Enter-only flow. |
| Q2 | Should selection mode exist in chunk view? | Resolved: no, selection is supported only in notes view. |
| Q3 | How should chunk focus be shown in the editor? | Resolved: same behavior as web - green left line on focused chunk blocks, cleared on click/tap. |
| Q4 | What lives in the note header after prior feature work? | Resolved: `Delete` stays centered in `headerTitle`; `ThemeToggle` stays beside the `⋮` button in `headerRight`. |
