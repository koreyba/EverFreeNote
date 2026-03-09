---
phase: planning
title: RAG Search on Mobile - Project Planning & Task Breakdown
description: Task breakdown for mobile AI search parity, chunk open-in-context, and search UI unification
---

# Project Planning & Task Breakdown

## Milestones

- [x] **M1:** Mobile AI search state and controls in place
- [x] **M2:** AI notes/chunks result views implemented with virtualization
- [x] **M3:** Open-in-context chunk scroll and highlight working in note editor
- [x] **M4:** Search result UI unified and covered by tests

## Task Breakdown

### Phase 1: State and Hooks

- [x] **T1.1** Create `ui/mobile/hooks/useMobileSearchMode.ts`
  - AsyncStorage-backed state for AI toggle, preset, and view mode
  - mirror web `useSearchMode` semantics with mobile storage

- [x] **T1.2** Create `ui/mobile/hooks/useMobileAIPaginatedSearch.ts`
  - copy-adapt web `useAIPaginatedSearch`
  - use mobile `client.functions.invoke`
  - reuse shared RAG constants/types

- [x] **T1.3** Extend `useOpenNote`
  - accept optional chunk focus payload
  - push note route with params needed for open-in-context

### Phase 2: Search Screen Refactor

- [x] **T2.1** Refactor `ui/mobile/app/(tabs)/search.tsx`
  - coordinate regular vs AI search
  - ensure only active mode loads
  - block mode/view changes during selection mode
  - keep search history and tag filter behavior intact

- [x] **T2.2** Add mobile AI controls
  - toggle
  - preset selector
  - notes/chunks view tabs

- [x] **T2.3** Add AI results rendering
  - `notes` view with grouped note cards
  - `chunks` view with flattened chunk cards
  - `FlashList` virtualization and `onEndReached`

- [x] **T2.4** Unify result-card visuals
  - bring regular note search and AI note search into the same visual system
  - preserve selection affordances in note lists

### Phase 3: Editor Open-In-Context

- [x] **T3.1** Extend `ui/mobile/components/EditorWebView.tsx`
  - add `scrollToChunk` handle method
  - bridge new message type to the embedded editor page

- [x] **T3.2** Extend `app/editor-webview/page.tsx`
  - handle chunk-focus messages from native
  - forward to `RichTextEditorWebView`

- [x] **T3.3** Extend `ui/web/components/RichTextEditorWebView.tsx`
  - expose `scrollToChunk`
  - reuse shared chunk focus logic/extension

- [x] **T3.4** Update `ui/mobile/app/note/[id].tsx`
  - read navigation params for pending chunk focus
  - adjust offset relative to body content
  - dispatch chunk focus once note/editor are ready

### Phase 4: Testing

- [x] **T4.1** Add hook tests
  - AI paginated search grouping, reset, and load-more behavior
  - mobile search mode persistence

- [x] **T4.2** Add integration tests for search screen
  - AI toggle activates selected mode
  - only active mode fetches
  - view switching blocked during selection mode
  - long press selection disabled in chunk view
  - AI result press opens note in context

- [x] **T4.3** Add editor bridge tests
  - note screen forwards chunk-focus params
  - EditorWebView posts chunk-focus message

## Dependencies

| Task | Depends on |
|------|-----------|
| T1.2 | shared AI constants/types already existing |
| T1.3 | shared note route and note editor entry points already existing |
| T2.1 | T1.1, T1.2 |
| T2.2 | T2.1 |
| T2.3 | T2.2, T1.3 |
| T2.4 | T2.3, T1.3 |
| T3.2 | T3.1 |
| T3.4 | T1.3, T3.1, T3.2, T3.3 |
| T4.x | corresponding implementation tasks |

## Risks & Sequencing Notes

- Build the AI hook and search state first so UI work stays deterministic.
- Land T1.3 and editor chunk focus before finalizing AI result taps; otherwise the tap flow cannot be validated end-to-end.
- Keep regular-search regressions visible by preserving existing integration coverage and extending it rather than replacing it.
