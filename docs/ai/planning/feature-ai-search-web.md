---
phase: planning
title: AI Search Web (RAG) — Project Planning & Task Breakdown
description: Task breakdown for semantic search UI with Note View, Chunk View, and context navigation
---

# Project Planning & Task Breakdown

## Milestones

- [ ] M1: `rag-search` Edge Function operational — query embeds and returns chunks
- [ ] M2: `useAISearch` hook + toggle wired into Sidebar
- [ ] M3: Note View fully functional (dedup, expand/collapse, score display)
- [ ] M4: Chunk View functional (2-per-note limit, "Open in context")
- [ ] M5: Strict ↔ Broad slider operational
- [ ] M6: "Open in context" scrolls and highlights in editor

## Task Breakdown

### Phase 1: Backend — `rag-search` Edge Function

- [ ] **1.1** New migration: update `match_notes` RPC to add `filter_tag TEXT DEFAULT NULL`
  - Join `note_embeddings ne` → `notes n ON ne.note_id = n.id`
  - Add `AND (filter_tag IS NULL OR filter_tag = ANY(n.tags))`
  - Mirror pattern of `search_notes_fts` migration
- [ ] **1.2** Create `supabase/functions/rag-search/index.ts`
  - Accept `{ query, topK, threshold, userId, filterTag? }` from request body
  - Read Gemini API key from `user_api_keys` table
  - Embed query via Gemini `models/gemini-embedding-001`
  - Call updated `match_notes(embedding, userId, topK, filterTag)` RPC
  - Enrich with `title` and `tags` via single `SELECT ... WHERE id = ANY(noteIds)`
  - Filter results by `similarity >= threshold`
  - Return `{ chunks: RagChunk[] }`
- [ ] **1.3** Add constants file `core/constants/aiSearch.ts` with slider anchor values and offset delta threshold
- [ ] **1.4** Add TypeScript types `RagChunk`, `RagNoteGroup` to `core/types/ragSearch.ts`

### Phase 2: Hooks

- [ ] **2.1** Create `useSearchMode` hook (`ui/web/hooks/useSearchMode.ts`)
  - Manages `isAIEnabled: boolean`, `viewMode: 'note' | 'chunk'`
  - Persists to `localStorage`
- [ ] **2.2** Create `useAISearch` hook (`ui/web/hooks/useAISearch.ts`)
  - Accepts `{ query, sliderValue, isEnabled }`
  - Debounces query (300ms), skips if `!isEnabled` or `query.length < 3`
  - Calls `rag-search` Edge Function via Supabase client
  - Applies offset-delta deduplication per note
  - Returns `{ noteGroups: RagNoteGroup[], isLoading, error }`

### Phase 3: UI Components

- [ ] **3.1** Create `AiSearchToggle` component
  - Toggle switch ON/OFF
  - Disabled + tooltip when Gemini API key not configured
- [ ] **3.2** Create `AiSearchPresetSelector` component
  - Segmented control / 3 buttons: Strict | Neutral | Broad
  - Selected state persisted via `useSearchMode`
  - Only visible/active when AI Search is ON
- [ ] **3.3** Create `AiSearchViewTabs` component
  - Tabs: "Notes" | "Chunks"
  - Only visible when AI Search is ON and has results
- [ ] **3.4** Create `NoteSearchItem` component
  - Title, tags, top score badge
  - Top 1 chunk snippet shown by default
  - "Show N more fragments" button → expands to ≤5 chunks
  - "+N hidden" label if chunks were filtered by dedup
- [ ] **3.5** Create `NoteSearchResults` component
  - Maps `noteGroups` → `NoteSearchItem` list
  - Empty state: "No results. Try Broad mode or reindex your notes."
- [ ] **3.6** Create `ChunkSearchItem` component
  - Note title (small), chunk text, score badge
  - "Open in context" button
- [ ] **3.7** Create `ChunkSearchResults` component
  - Flattens noteGroups to ≤2 chunks/note, renders `ChunkSearchItem` list
- [ ] **3.8** Update `Sidebar.tsx`
  - Add `AiSearchToggle` below search input
  - Conditionally render `AiSearchPresetSelector` and `AiSearchViewTabs` when AI ON
  - Route results to `NoteSearchResults` or `ChunkSearchResults` based on `viewMode`
  - Keep existing FTS results when AI is OFF

### Phase 4: "Open in context" Navigation

> **Context:** TipTap v3 + ProseMirror. `char_offset` is a plain-text position; ProseMirror uses document positions (includes non-text nodes). Conversion via `doc.descendants()`. Left-border highlight uses a ProseMirror `NodeDecoration` (not the Highlight extension, which is background-only). Pattern reference: `core/utils/prosemirrorCaret.ts`.

- [ ] **4.1** Extend `RichTextEditorHandle` with `scrollToChunk(charOffset: number, chunkLength: number)`
  - Convert plain-text `charOffset` → ProseMirror doc position by iterating `doc.descendants()` and accumulating text length
  - Apply `NodeDecoration` with CSS class `chunk-focus` to the containing block node (`border-left: 3px solid var(--accent)`)
  - Scroll: `editor.commands.scrollIntoView()` after setting selection at the resolved position
  - Clear decoration on next `mousedown`/click in editor (via ProseMirror plugin)
  - Add `.chunk-focus` CSS rule to editor stylesheet
- [ ] **4.2** Wire "Open in context" button
  - Dispatch action: open note by `noteId` (reuse existing note-open flow)
  - After note renders, call `editorRef.current.scrollToChunk(charOffset, chunkLength)`
  - Handle race condition: wait for editor `onReady` if note was not previously open
- [ ] **4.3** If a different note is open — switch note first, then scroll (sequential, not parallel)

### Phase 5: Polish & Error Handling

- [ ] **5.1** Loading skeleton for search results
- [ ] **5.2** Error state: "AI Search unavailable" with retry
- [ ] **5.3** "Notes not indexed" prompt with link to RagIndexPanel
- [ ] **5.4** Keyboard navigation: Tab through results, Enter on "Open in context"
- [ ] **5.5** ARIA labels on toggle, slider, tabs

## Dependencies

- `note_embeddings` table and `match_notes` RPC already exist; migration 1.1 extends `match_notes` with `filter_tag`
- Gemini API key stored in `user_api_keys` (existing pattern, reused from `rag-index`)
- Phase 4 depends on Phase 3 (note must open before scroll); tasks 4.2–4.3 depend on 4.1
- `NodeDecoration` pattern is new in this codebase — reference `prosemirrorCaret.ts` for existing PM integration style

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini embed latency > 2s | Medium | Medium | Show loading state immediately; consider caching embeddings for repeated queries |
| `match_notes` returns too few results in Strict mode | Low | Low | Adjust Strict anchor defaults; allow user to switch to Broad |
| charOffset → PM position conversion breaks for rich content | Low | Medium | Use `doc.descendants()` accumulation (same approach as `prosemirrorCaret.ts`); test with headings, lists, images |
| NodeDecoration not cleared on note switch | Low | Low | Clear decoration in the note-switch handler before rendering new content |
| Dedup hides too many relevant chunks | Low | Medium | Expose OFFSET_DELTA_THRESHOLD as a configurable constant; tune in QA |
