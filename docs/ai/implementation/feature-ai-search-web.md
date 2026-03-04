---
phase: implementation
title: AI Search Web (RAG) — Implementation Guide
description: Technical notes for the rag-search Edge Function, useAISearch hook, and UI components
---

# Implementation Guide

## Development Setup

**Prerequisites:**
- Supabase CLI for deploying and testing the new Edge Function locally
- Existing `note_embeddings` table and `match_notes` RPC in place
- At least one note indexed via `RagIndexPanel` for manual testing

**Key files to read before starting:**
- `supabase/functions/rag-index/index.ts` — reference for Gemini embed pattern
- `core/constants/search.ts` — existing search constants pattern
- `ui/web/hooks/useNoteSearch.ts` — existing FTS hook to keep in parity
- `ui/web/components/features/notes/Sidebar.tsx` — integration point

## Code Structure

```
core/
  constants/
    aiSearch.ts          # OFFSET_DELTA_THRESHOLD, slider anchors
  types/
    ragSearch.ts         # RagChunk, RagNoteGroup interfaces

supabase/functions/
  rag-search/
    index.ts             # New Edge Function

ui/web/
  hooks/
    useAISearch.ts       # Main RAG search hook
    useSearchMode.ts     # AI toggle + view mode persistence

  components/features/search/   # New directory
    AiSearchToggle.tsx
    AiSearchPresetSelector.tsx
    AiSearchViewTabs.tsx
    NoteSearchResults.tsx
    NoteSearchItem.tsx
    ChunkSearchResults.tsx
    ChunkSearchItem.tsx
    ChunkSnippet.tsx
```

## Implementation Notes

### Core Features

**`core/constants/aiSearch.ts`**
```typescript
export const OFFSET_DELTA_THRESHOLD = 300 // chars

export type SearchPreset = 'strict' | 'neutral' | 'broad'

export const SEARCH_PRESETS: Record<SearchPreset, { topK: number; threshold: number }> = {
  strict:  { topK: 5,  threshold: 0.75 },
  neutral: { topK: 15, threshold: 0.55 },
  broad:   { topK: 30, threshold: 0.40 },
}

export const DEFAULT_PRESET: SearchPreset = 'neutral'
```

**`rag-search` Edge Function** — mirrors `rag-index` pattern:
1. Parse and validate request body.
2. Fetch Gemini API key: `SELECT api_key FROM user_api_keys WHERE user_id = $1 AND provider = 'gemini'`.
3. Embed query with Gemini (same model and dimensions as indexing).
4. Call `match_notes(embedding, userId, topK)` RPC.
5. `SELECT id, title, tags FROM notes WHERE id = ANY(noteIds)` to enrich.
6. Filter by `similarity >= threshold`, map to `RagChunk[]`, return JSON.

**Deduplication in `useAISearch`:**
```typescript
function deduplicateChunks(chunks: RagChunk[], maxCount: number): {
  accepted: RagChunk[]
  hiddenCount: number
} {
  const accepted: RagChunk[] = []
  for (const chunk of chunks) {  // already sorted by similarity desc
    const tooClose = accepted.some(
      a => Math.abs(chunk.charOffset - a.charOffset) < OFFSET_DELTA_THRESHOLD
    )
    if (!tooClose) accepted.push(chunk)
    if (accepted.length >= maxCount) break
  }
  return { accepted, hiddenCount: chunks.length - accepted.length }
}
```

**Grouping in `useAISearch`:**
```typescript
function groupByNote(chunks: RagChunk[]): RagNoteGroup[] {
  const map = new Map<string, RagChunk[]>()
  for (const c of chunks) {
    if (!map.has(c.noteId)) map.set(c.noteId, [])
    map.get(c.noteId)!.push(c)
  }
  return Array.from(map.entries()).map(([noteId, noteChunks]) => {
    const sorted = noteChunks.sort((a, b) => b.similarity - a.similarity)
    const { accepted, hiddenCount } = deduplicateChunks(sorted, 5)
    return {
      noteId,
      noteTitle: sorted[0].noteTitle,
      noteTags: sorted[0].noteTags,
      topScore: sorted[0].similarity,
      chunks: accepted,
      hiddenCount,
    }
  }).sort((a, b) => b.topScore - a.topScore)
}
```

**"Open in context" — scroll to charOffset:**
- Editor is **TipTap v3** (ProseMirror-based). Use `doc.descendants()` to convert plain-text `charOffset` → PM doc position.
- Apply `NodeDecoration` with CSS class `chunk-focus` (`border-left: 3px solid var(--accent)`) to the containing block node.
- Scroll via `editor.commands.scrollIntoView()` after setting selection.
- Clear decoration on next `mousedown` in editor via a ProseMirror plugin transaction.
- Reference pattern: `core/utils/prosemirrorCaret.ts`.

### Patterns & Best Practices

- Follow the `useNoteSearch` pattern for debounce (300ms) and minimum query length (3 chars).
- Use `useQuery` from React Query for `useAISearch` — cache key: `['aiSearch', query, preset, filterTag]`, stale time: 30s.
- New search components go in `components/features/search/` (new directory following `features/notes/` pattern).
- Toggle, preset, and view mode state go in `useSearchMode` — `{ isAIEnabled, preset: SearchPreset, viewMode }` — persisted via `localStorage` (key: `everfreenote:aiSearchMode`).

## Integration Points

- **Sidebar**: Conditionally render AI controls below the existing `<SearchInput>`. When AI is ON, suppress FTS results and render AI results instead.
- **Editor panel**: Add a `ref`-based `scrollToChunk` method exposed via context or a custom event.
- **Supabase client**: Use the existing Supabase client from context — same pattern as `rag-index` calls.

## Error Handling

| Scenario | Handling |
|----------|----------|
| Gemini API key missing | Disable toggle, show tooltip: "Configure Gemini API key in Settings" |
| No indexed notes | Show inline prompt linking to RagIndexPanel |
| Edge Function error (5xx) | Show error state: "AI Search unavailable. Try again." |
| Empty results | Show "No results found. Try adjusting the Strict↔Broad slider." |
| Network timeout | Abort after 10s, show error state |

## Performance Considerations

- Debounce 300ms to avoid a Gemini API call on every keystroke.
- React Query caches responses for 30s — repeated identical queries are free.
- Cap chunk `content` returned from Edge Function at 300 chars for display (full content stored in DB).
- For Chunk View, the flat list should be virtualized if > 50 items (use existing virtualizer pattern if available).

## Security Notes

- Gemini API key is read server-side in the Edge Function — never sent to the browser.
- `match_notes` RPC enforces `user_id` filtering — RLS ensures users only see their own embeddings.
- Edge Function validates `userId` from the JWT token, not just the request body.
