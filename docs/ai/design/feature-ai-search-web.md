---
phase: design
title: AI Search Web (RAG) — System Design & Architecture
description: Architecture for semantic search UI with Note View, Chunk View, deduplication, and context navigation
---

# System Design & Architecture

## Architecture Overview

```mermaid
graph TD
    subgraph UI["Web UI"]
        SB[Sidebar / SearchBar]
        Toggle[AI Search Toggle]
        Slider[Strict / Neutral / Broad Selector]
        ModeSwitch[Note View / Chunk View Tab]
        NoteView[NoteSearchResults]
        ChunkView[ChunkSearchResults]
        ContextNav[Open in Context]
    end

    subgraph Hooks["React Hooks"]
        useSearchMode[useSearchMode]
        useAISearch[useAISearch]
        useNoteSearch[useNoteSearch - existing FTS]
    end

    subgraph Edge["Supabase Edge Functions"]
        RagSearch[rag-search]
        RagIndex[rag-index - existing]
    end

    subgraph DB["Supabase / PostgreSQL"]
        NoteEmb[(note_embeddings)]
        MatchFn[match_notes RPC]
    end

    GeminiAPI[Gemini Embedding API]

    Toggle -->|isAIEnabled| useSearchMode
    ModeSwitch -->|viewMode| useSearchMode
    SB -->|query| useAISearch
    useSearchMode -->|isAIEnabled, viewMode| useAISearch
    Slider -->|preset: topK + threshold| useAISearch
    SB -->|filterTag| useAISearch
    useAISearch -->|POST + JWT| RagSearch
    RagSearch -->|embed query| GeminiAPI
    RagSearch -->|match_notes RPC + filterTag| MatchFn
    MatchFn --> NoteEmb
    useAISearch -->|RagNoteGroup[]| NoteView
    useAISearch -->|RagNoteGroup[]| ChunkView
    ContextNav -->|noteId + charOffset| EditorPanel[Editor / ScrollHighlight]
```

**Key responsibilities:**
- `useAISearch` — orchestrates query, debounce, deduplication, and grouping.
- `rag-search` Edge Function — embeds the query with Gemini, calls `match_notes`, returns raw chunk results.
- `NoteSearchResults` — Note View renderer with expand/collapse.
- `ChunkSearchResults` — Chunk View renderer.
- Deduplication logic lives in `useAISearch` (client-side, post-response).

## Data Models

### `RagChunk` (from `match_notes` RPC + note metadata)
```typescript
interface RagChunk {
  noteId: string
  chunkIndex: number
  charOffset: number
  content: string          // chunk text
  similarity: number       // 0–1 cosine similarity
  noteTitle: string
  noteTags: string[]
}
```

### `RagNoteGroup` (computed in useAISearch)
```typescript
interface RagNoteGroup {
  noteId: string
  noteTitle: string
  noteTags: string[]
  topScore: number         // highest chunk similarity for the note
  chunks: RagChunk[]       // deduplicated, sorted desc by similarity
  hiddenCount: number      // chunks filtered out by deduplication
}
```

### Deduplication Rules (MVP)
Applied per-note after fetching raw chunks:
1. Sort chunks by `similarity` descending.
2. For each candidate chunk, skip it if any already-accepted chunk has `|candidate.charOffset - accepted.charOffset| < 300`.
3. Keep up to **5** accepted chunks per note (Note View), or **2** per note (Chunk View).
4. Set `hiddenCount = totalRawChunks - acceptedCount`.

> **Post-MVP**: cosine similarity between chunk pairs (> 0.9 → deduplicate) can be added if vectors are returned by the RPC.

## API Design

### `rag-search` Edge Function

**Request:**
```typescript
POST /functions/v1/rag-search
// Authorization: Bearer <supabase_jwt>   ← userId is read from JWT, NOT request body
{
  query: string              // user search text
  topK: number               // number of chunks to retrieve (5 / 15 / 30)
  threshold: number          // minimum similarity (0.75 / 0.55 / 0.40)
  filterTag?: string | null  // active tag filter (null = no filter)
}
```

**Response:**
```typescript
{
  chunks: Array<{
    noteId: string
    noteTitle: string
    noteTags: string[]
    chunkIndex: number
    charOffset: number
    content: string
    similarity: number
  }>
}
```

The Edge Function:
1. Extracts `userId` from the Supabase JWT (not from request body).
2. Reads user's Gemini API key from `user_api_keys` using `userId`.
3. Calls Gemini to embed `query` (model: `models/gemini-embedding-001`, dim 1536).
4. Calls updated `match_notes` RPC with `(query_embedding, userId, topK, filterTag)` — tag filtering happens in SQL via `filter_tag = ANY(n.tags)`.
5. `match_notes` returns chunks; Edge Function enriches result with `title` and `tags` via `SELECT id, title, tags FROM notes WHERE id = ANY(noteIds)`.
6. Filters results by `similarity >= threshold` **in the Edge Function** (post-RPC, before returning).
7. Returns chunk list.

### Strict ↔ Broad Preset Mapping

3 дискретных состояния (не непрерывный слайдер):

| State | topK | threshold |
|-------|------|-----------|
| Strict | 5 | 0.75 |
| Neutral *(default)* | 15 | 0.55 |
| Broad | 30 | 0.40 |

UI: 3 кнопки/таба или segmented control (Strict / Neutral / Broad). Нет линейной интерполяции — каждое состояние передаёт фиксированные `topK` и `threshold`.

## Component Breakdown

### New Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AiSearchToggle` | `features/search/AiSearchToggle.tsx` | ON/OFF toggle, disabled state if no API key |
| `AiSearchPresetSelector` | `features/search/AiSearchPresetSelector.tsx` | Segmented control: Strict / Neutral / Broad |
| `AiSearchViewTabs` | `features/search/AiSearchViewTabs.tsx` | "Notes" / "Chunks" tab switcher |
| `NoteSearchResults` | `features/search/NoteSearchResults.tsx` | Note View list with expand/collapse |
| `NoteSearchItem` | `features/search/NoteSearchItem.tsx` | Single note row: title, tags, score, chunks |
| `ChunkSearchResults` | `features/search/ChunkSearchResults.tsx` | Chunk View list |
| `ChunkSearchItem` | `features/search/ChunkSearchItem.tsx` | Single chunk row: note title, text, score, "Open in context" |
| `ChunkSnippet` | `features/search/ChunkSnippet.tsx` | Renders chunk text in search results (truncated, no special highlighting needed — plain text display) |

### Modified Components

| Component | Change |
|-----------|--------|
| `Sidebar.tsx` | Add AI Search Toggle, Slider, View Tabs below SearchBar when AI mode is active |
| `NoteEditor` / `EditorPanel` | Add `scrollToOffset(charOffset)` + permanent left-border highlight (cleared on next click elsewhere) |

### New Hooks

| Hook | Path | Responsibility |
|------|------|----------------|
| `useAISearch` | `hooks/useAISearch.ts` | Query debounce (300ms), call `rag-search`, deduplication, grouping |
| `useSearchMode` | `hooks/useSearchMode.ts` | Persist AI toggle ON/OFF and view mode (localStorage) |

## Design Decisions

### D1: Client-side deduplication
Deduplication runs in the browser after receiving raw chunks, using only `charOffset` delta. This avoids a second DB round-trip and keeps the Edge Function simple.

**Trade-off**: For post-MVP cosine-between-chunk dedup, vectors need to be returned (increases payload) or a second SQL pass added.

### D2: Separate Edge Function (`rag-search`)
Rather than adding AI search to the existing `rag-index` function, a dedicated `rag-search` function keeps responsibilities separate and independently scalable.

### D3: 3-state preset selector (not continuous slider)
The Strict/Neutral/Broad control uses 3 fixed presets defined in `core/constants/aiSearch.ts`. This simplifies the UI (segmented control vs slider) and avoids partial states that could confuse users. Each preset directly maps to `{ topK, threshold }` — no interpolation.

### D4: charOffset-based scroll navigation + permanent left-border highlight
The `char_offset` column already exists in `note_embeddings`. The editor will use this offset to scroll to the paragraph containing the chunk. Highlight style: **permanent left-border stripe** (e.g. `border-left: 3px solid accent`) on the matched paragraph, cleared when the user clicks anywhere else in the editor. No time-based fade — the highlight stays until dismissed.

### D5: Persist AI toggle state
AI Search ON/OFF and view mode (Note/Chunk) are persisted to `localStorage` so they survive page refreshes.

### D6: Tag filter via DB-side `match_notes` extension
Tag filtering is applied inside the `match_notes` SQL function (new `filter_tag TEXT DEFAULT NULL` parameter), mirroring the `search_notes_fts` approach (`filter_tag = ANY(n.tags)`). This requires a new migration. Post-filtering in the Edge Function is avoided to prevent result starvation when topK is small.

### D7: Score displayed as percentage
`similarity * 100`, rounded to nearest integer, shown as e.g. `85%`. Applied in the UI layer — no changes needed in the Edge Function response.

### D8: Empty query shows full notes list
When AI Search is ON but query is empty/short (< 3 chars), the sidebar falls back to the normal notes list (same behavior as FTS). No RAG call is made.

## Non-Functional Requirements

- **Latency**: RAG search should return results within 2s (Gemini embed + pgvector query).
- **Payload**: Each `rag-search` response should be ≤ 100KB (cap content to 300 chars per chunk in response if needed).
- **No extra dependencies**: No new npm packages required beyond existing stack.
- **Accessibility**: Toggle and slider must be keyboard-accessible with ARIA labels.
- **Security**: User's Gemini API key is never exposed to the browser; Edge Function reads it server-side.
