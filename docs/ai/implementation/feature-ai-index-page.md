---
phase: implementation
title: AI Index Page - Implementation Guide
description: Implementation notes for the dedicated Settings AI index management flow
---

# Implementation Guide

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

### Patterns & Best Practices

- Follow the `NoteList` virtualization pattern, but do not reuse `NoteCard`.
- Prefer small focused components over branching existing settings panels heavily.
- Keep mutation refresh logic centralized so row state updates stay consistent.

## Integration Points

- Reads: Postgres RPC `get_ai_index_notes`
- Writes: existing `rag-index` Edge Function
- Navigation: existing `tab` query param handling in `SettingsPage`
- Search semantics: shared text-search utilities from `@core/utils/search`

## Error Handling

- Surface fetch failures in the tab body with retry affordance if needed.
- Surface row action failures inline or via toast, matching existing settings behavior.
- If PostgREST schema cache is stale and still sees the old `get_ai_index_notes` signature, show actionable migration guidance instead of a generic fetch error.

## Performance Considerations

- Keep pagination and status filtering server-side.
- Virtualize rows with dynamic heights and overscan.
- Invalidate only the dedicated AI index query after mutations.

## Security Notes

- Keep all note/index list data scoped to the authenticated user.
- Do not expose service secrets to the browser.
- Browser auth storage must stay isolated per local Supabase stack/port to avoid cross-stack sessions where RPC reads succeed but edge-function writes fail with `Unauthorized`.
