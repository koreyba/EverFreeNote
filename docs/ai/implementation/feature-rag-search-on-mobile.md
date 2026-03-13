---
phase: implementation
title: RAG Search on Mobile - Implementation Notes
description: Implementation progress and technical notes for mobile AI search parity
---

# Implementation Notes

## Status

Mobile AI search parity implementation is now in place.

Validated on 2026-03-09 with:
- `npm run type-check`
- `npm run lint`
- targeted Jest suites for search screen AI flows, existing search flows, note editor flows, and persisted mobile search mode state

Previous scope for this feature already shipped:
- note-level RAG indexing menu on mobile
- settings redesign and Gemini API key management

Current extension of the feature:
- full mobile AI search parity with web
- note/chunk views
- strictness presets
- open-in-context chunk focus in the mobile editor

## Implementation Strategy

### Search state
- Keep existing `useSearch` for regular search.
- Add a mobile AI hook mirroring web `useAIPaginatedSearch`.
- Coordinate active-mode behavior in `search.tsx` so only one mode fetches and paginates.

### Search controls
- Add mobile-native controls for:
  - AI toggle
  - strictness preset
  - notes/chunks view
- Persist control state with AsyncStorage to avoid surprising resets.

### Result rendering
- Preserve `FlashList` for virtualization.
- Use grouped note cards for AI notes view.
- Use flattened chunk cards for AI chunk view.
- Unify note-card styling so regular and AI search feel consistent.

### Open in context
- Extend `useOpenNote` and `note/[id].tsx` to carry pending chunk-focus requests.
- Extend `EditorWebView` bridge and embedded editor page with `scrollToChunk`.
- Reuse `ChunkFocusExtension` for the green left highlight and clear-on-click behavior.

## Technical Notes

### Title-prefix adjustment
The RAG index prepends `title + " "` ahead of body content. Mobile must apply the same offset correction as web before scrolling to a chunk.

### Single active loader rule
The search screen should never call both:
- regular `fetchNextPage`
- AI `loadMoreAI`

The active mode owns the list, empty state, loading state, and pagination callbacks.

### Selection-mode guard
Selection mode is valid only for note-style result lists. While active:
- AI toggle is disabled
- notes/chunks tabs are disabled
- leaving selection mode restores normal switching

## Validation Plan

Completed checks for this iteration:
- `npm test -- --runInBand tests/integration/searchScreen.test.tsx tests/integration/searchScreenAI.test.tsx tests/integration/noteEditorScreen.test.tsx tests/component/useMobileSearchMode.test.tsx`
- `npm run type-check`
- `npm run lint`
