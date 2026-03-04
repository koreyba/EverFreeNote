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
        Toggle[AI RAG Search Toggle]
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
- `useAISearch` — orchestrates Enter-triggered queries, deduplication, and grouping. No internal debounce — query fires only when explicitly submitted.
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
4. Calls `match_notes` RPC with `(query_embedding, match_count, filter_tag)` — user scoping is handled inside the function via `auth.uid()`; tag filtering happens in SQL via `filter_tag = ANY(n.tags)`.
5. `match_notes` returns chunks; Edge Function enriches result with `title` and `tags` via `SELECT id, title, tags FROM notes WHERE id = ANY(noteIds)`.
6. Filters results by `similarity >= threshold` **in the Edge Function** (post-RPC, before returning).
7. Returns chunk list.

### Strict ↔ Broad Preset Mapping

3 discrete states (not a continuous slider):

| State | topK | threshold |
|-------|------|-----------|
| Strict | 5 | 0.75 |
| Neutral *(default)* | 15 | 0.55 |
| Broad | 30 | 0.40 |

UI: 3-button segmented control (Strict / Neutral / Broad). No linear interpolation — each state maps to fixed `topK` and `threshold` values.

## Component Breakdown

### New Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AiSearchToggle` | `features/search/AiSearchToggle.tsx` | ON/OFF toggle labelled "AI RAG Search"; disabled + tooltip when no API key; `ⓘ` Info icon with hover/tap tooltip explaining RAG search and Enter-to-search |
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
| `Sidebar.tsx` | Add AI RAG Search Toggle, Preset Selector, View Tabs below SearchBar when AI mode is active. When AI ON: FTS debounce disabled; Enter submits AI search. When AI OFF: Enter triggers FTS immediately (cancels pending debounce). `AiSearchViewTabs` only shown when results exist. |
| `NoteEditor` / `EditorPanel` | `scrollToChunk(charOffset, chunkLength)` + permanent left-border highlight (cleared on next click elsewhere). Fallback pending scroll queue (`pendingChunkScrollRef`) handles TipTap `immediatelyRender: false` race. |

### New Hooks

| Hook | Path | Responsibility |
|------|------|----------------|
| `useAISearch` | `hooks/useAISearch.ts` | Call `rag-search` when query changes (Enter-triggered, no internal debounce), deduplication, grouping |
| `useSearchMode` | `hooks/useSearchMode.ts` | Persist AI toggle ON/OFF, view mode, and preset (localStorage) |

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
AI RAG Search ON/OFF, view mode (Note/Chunk), and preset (Strict/Neutral/Broad) are persisted to `localStorage` so they survive page refreshes.

### D6: Tag filter via DB-side `match_notes` extension
Tag filtering is applied inside the `match_notes` SQL function (new `filter_tag TEXT DEFAULT NULL` parameter), mirroring the `search_notes_fts` approach (`filter_tag = ANY(n.tags)`). This requires a new migration. Post-filtering in the Edge Function is avoided to prevent result starvation when topK is small.

### D7: Score displayed as percentage
`similarity * 100`, rounded to nearest integer, shown as e.g. `85%`. Applied in the UI layer — no changes needed in the Edge Function response.

### D8: Empty / unsubmitted query shows full notes list
When AI RAG Search is ON but no query has been submitted via Enter (or the submitted query is < 3 chars), the sidebar shows the regular notes list. No RAG call is made.

### D9: Enter-triggered search (not debounced on type)
AI RAG search fires **only on Enter**, not on every keystroke. When AI is ON, FTS debounce is also suppressed — Enter is the single trigger for both modes.

**Rationale**: Each RAG query calls the Gemini Embedding API (costs money and quota). Debouncing on type would fire on every pause in typing. Enter gives the user explicit control and avoids unnecessary API spend.

**Trade-off**: Slightly less "instant" UX compared to FTS. Mitigated by the fact that users typically form a complete thought before semantically searching, unlike keyword search where partial matches are useful.

### D10: Native DOM scroll for "Open in context"
`scrollToChunk` uses `el.scrollIntoView({ behavior: 'smooth', block: 'center' })` directly on the `.chunk-focus` DOM element (obtained via `editor.view.dom.querySelector`) rather than ProseMirror's `tr.scrollIntoView()`.

**Rationale**: ProseMirror's built-in scroll relies on traversing ancestor `overflow` styles, which can fail when the scroll container is several levels up. Native `scrollIntoView` is guaranteed to find the correct scroll ancestor regardless of DOM depth.

**Pending scroll queue**: `pendingChunkScrollRef` in `RichTextEditor` stores a scroll request made before TipTap finishes initializing (`immediatelyRender: false` causes `editor = null` on first render). The request is executed in TipTap's `onCreate` callback once the editor is ready.

## Non-Functional Requirements

- **Latency**: RAG search should return results within 2s (Gemini embed + pgvector query).
- **Payload**: Each `rag-search` response should be ≤ 100KB (cap content to 300 chars per chunk in response if needed).
- **No extra dependencies**: No new npm packages required beyond existing stack.
- **Accessibility**: Toggle and slider must be keyboard-accessible with ARIA labels.
- **Security**: User's Gemini API key is never exposed to the browser; Edge Function reads it server-side.
