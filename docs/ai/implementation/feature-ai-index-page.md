---
phase: implementation
title: AI Index Page - Implementation Guide
description: Implementation notes for the dedicated Settings AI index management flow
---

# Implementation Guide

## Related Documents

- Requirements: [feature-ai-index-page.md](../requirements/feature-ai-index-page.md)
- Design: [feature-ai-index-page.md](../design/feature-ai-index-page.md)

Expected workflow: align on requirements first, capture the chosen architecture and tradeoffs in design second, and use this implementation guide last to apply those decisions in code.

## Development Setup

- Use the feature worktree `feature-ai-index-page`.
- Run frontend and Supabase tooling as usual for the web app.
- Apply migration `20260329000001_add_get_ai_index_notes_rpc.sql`.
- Apply migration `20260329000002_add_search_to_ai_index_notes_rpc.sql`.
- Reuse the deployed/local `rag-index` function for row mutations.

## Code Structure

- Settings integration lives under `ui/web/components/features/settings/`.
- AI Index-specific list pieces should stay isolated from the notes page controller.
- Data fetching uses:
  - `supabase.rpc("get_ai_index_notes", ...)` for reads
  - `supabase.functions.invoke("rag-index", ...)` for writes

### Implemented files

```text
supabase/migrations/
  20260329000001_add_get_ai_index_notes_rpc.sql
  20260329000002_add_search_to_ai_index_notes_rpc.sql

core/types/
  aiIndex.ts

ui/web/hooks/
  useAIIndexNotes.ts

ui/web/components/features/settings/
  AIIndexTab.tsx
  AIIndexList.tsx
  AIIndexNoteRow.tsx
  SettingsPage.tsx (updated)
```

## Implementation Notes

### Core Features

- Add an `AI Index` tab to `SettingsPage`.
- Build a dedicated `AIIndexTab` container with filters, ordinary search row, and virtualized list.
- Use dedicated server-backed status-aware pagination through `get_ai_index_notes`.
- Reuse the shared search utilities (`SEARCH_CONFIG`, `buildTsQuery`, language mapping) so AI Index search behaves like the main notes search without reusing the notes controller.
- Make each AI Index row open the corresponding note in the main notes shell while preserving the originating `Settings -> AI Index` view state for back navigation.
- Refine the page so it surfaces the user's working context directly: visible count, loaded count, active scope, active search, reset affordances, and clearer empty-state recovery.
- Keep the summary chrome intentionally compact so the note list appears on the first screen without requiring an initial scroll.
- Hide the redundant Settings-section hero for `AI Index` specifically; the left navigation already provides the tab label and description.

### Patterns & Best Practices

- Follow the `NoteList` virtualization pattern, but do not reuse `NoteCard`.
- Prefer small focused components over branching existing settings panels heavily.
- Keep mutation refresh logic centralized so row state updates stay consistent.
- Persist only the narrow AI Index UI state needed for round-tripping (`filter`, search input/query, list scroll offset, return path) via session storage rather than coupling Settings state to the main notes controller.
- Prefer status-driven action emphasis over always rendering the same button stack. For example, non-indexed notes should emphasize `Index note`, while `Remove from index` should disappear when it is not actionable.
- Prefer compact rows over metadata-heavy cards. The title should get more room (including two-line truncation), while date details should not dominate the row when status already communicates the main state.
- Keep the row card-like rather than turning it into a rigid table. The title block should own most of the width, status should live as a compact badge in the metadata line, and action buttons can stay equal-width without stealing title space on desktop or mobile.
- Because AI Index commonly opens notes in the main workspace after a cold `/settings` load, prefetch the `/` route and prewarm the first main-notes query page while the AI Index tab is already visible.
- Treat row mutations as optimistic UI updates: if the current filter still includes the note, swap its status/button state immediately; if the mutation moves the note out of the active filter, keep it around just long enough for a short exit animation before removing it from the visible list.
- Keep the underlying `rag-index` source of truth aligned with the optimistic UI by writing a fresh `indexed_at` timestamp during reindex upserts; otherwise `Outdated` notes can stay stale even after a successful reindex.
- Normalize `rag-index` payloads through `core/rag/indexResult.ts` so semantic non-success responses such as `reason: "too_short"` do not show a false success state in AI Index.

## Mobile Implementation

### Implemented files

```text
ui/mobile/hooks/
  useAIIndexNotes.ts

ui/mobile/components/settings/
  AIIndexPanel.tsx
  AIIndexNoteCard.tsx
  SettingsTabBar.tsx (modified — added 'aiIndex' to SettingsTabKey)

ui/mobile/app/(tabs)/
  settings.tsx (modified — added AI Index tab, initial state, panel config)
```

### Mobile-specific patterns

- `createStyles(colors)` + `StyleSheet.create()` for styling.
- `memo()` on `AIIndexNoteCard` for FlatList performance.
- `useTheme()` for colors, `useSupabase()` for `{ client, user }` (mobile provider pattern).
- `Badge` with custom `style`/`textStyle` for status-specific colors.
- `Button` with `variant` (default/outline), `size` (sm), `loading` prop.
- `Toast.show({ type, text1 })` for success/error feedback.
- `void` operator on floating promises to satisfy `@typescript-eslint/no-floating-promises`.
- `?? undefined` on `result.message` (type is `string | null`) for Toast's `string | undefined` expectation.

### Key differences from web

| Concern | Web | Mobile |
|---------|-----|--------|
| List virtualization | `react-window` with dynamic heights | `FlatList` with `onEndReached` |
| Mutation feedback | Optimistic UI + exit animation | Cache invalidation + toast |
| Note navigation | Row click opens note, preserves Settings state | Not implemented (action-only cards) |
| Search debounce | `useDebouncedCallback` hook | `useRef` + `setTimeout` (300ms) |
| Error extraction | `extractErrorMessage` with Response body parsing | Simple `err.message` fallback |

## Integration Points

- Reads: Postgres RPC `get_ai_index_notes`
- Writes: existing `rag-index` Edge Function
- Navigation: existing `tab` query param handling in `SettingsPage`
- Search semantics: shared text-search utilities from `@core/utils/search`
- Cross-route note opening: `app/page.tsx` restores note selection via the existing `restoreUiState` bridge and a lightweight AI Index navigation snapshot

## Error Handling

- Surface fetch failures in the tab body with retry affordance if needed.
- Surface row action failures inline or via toast, matching existing settings behavior.
- If PostgREST schema cache is stale and still sees the old `get_ai_index_notes` signature, show actionable migration guidance instead of a generic fetch error.
- Empty filtered/search results should offer a direct way back out (`Clear search`, `Reset filter`, `Show all notes`) instead of leaving the user at a dead end.

## Performance Considerations

- Keep pagination and status filtering server-side.
- Virtualize rows with dynamic heights and overscan.
- Invalidate only the dedicated AI index query after mutations.

## Security Notes

- Keep all note/index list data scoped to the authenticated user.
- Do not expose service secrets to the browser.
- Browser auth storage must stay isolated per local Supabase stack/port to avoid cross-stack sessions where RPC reads succeed but edge-function writes fail with `Unauthorized`.
