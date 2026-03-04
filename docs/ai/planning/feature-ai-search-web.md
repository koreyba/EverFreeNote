---
phase: planning
title: AI Search Web (RAG) — Project Planning & Task Breakdown
description: Task breakdown for semantic search UI with Note View, Chunk View, and context navigation
---

# Project Planning & Task Breakdown

## Status Summary *(updated 2026-03-04)*

**All 6 milestones complete.** The full AI RAG Search feature is implemented and manually verified. Remaining open item: commit two untracked Deno config files before merging.

---

## Milestones

- [x] M1: `rag-search` Edge Function operational — query embeds and returns chunks
- [x] M2: `useAISearch` hook + toggle wired into Sidebar
- [x] M3: Note View fully functional (dedup, expand/collapse, score display)
- [x] M4: Chunk View functional (2-per-note limit, "Open in context")
- [x] M5: Strict ↔ Broad preset selector operational
- [x] M6: "Open in context" scrolls and highlights in editor

---

## Task Breakdown

### Phase 1: Backend — `rag-search` Edge Function ✅

- [x] **1.1** New migration: update `match_notes` RPC to add `filter_tag TEXT DEFAULT NULL`
  - Delivered in `20260304000001_add_filter_tag_to_match_notes.sql`
- [x] **1.2** Create `supabase/functions/rag-search/index.ts`
  - Reads Gemini API key from `user_api_keys`; embeds via `models/gemini-embedding-001`; calls updated `match_notes` RPC; enriches with title/tags; filters by threshold; returns `{ chunks }`
  - *Note:* `deno.json` and `import_map.json` are present locally but **not yet committed** — must be committed before merge (⚠️ blocking)
- [x] **1.3** Constants file `core/constants/aiSearch.ts` — preset anchor values, debounce delay, offset delta threshold
- [x] **1.4** TypeScript types `RagChunk`, `RagNoteGroup` in `core/types/ragSearch.ts`

### Phase 2: Hooks ✅

- [x] **2.1** `useSearchMode` hook — `isAIEnabled`, `viewMode`, `preset` persisted to `localStorage`
- [x] **2.2** `useAISearch` hook — calls `rag-search`, applies offset-delta dedup, returns `noteGroups`, `isLoading`, `error`, `refetch`
  - *Scope change:* query debounce (300ms) replaced by **Enter-key trigger** to avoid unnecessary Gemini API calls. Planning doc said "debounces on type"; actual behavior is intentional and cost-driven.

### Phase 3: UI Components ✅

- [x] **3.1** `AiSearchToggle` — toggle + "no API key" tooltip; **renamed to "AI RAG Search"**; added `ⓘ` Info tooltip explaining RAG search and Enter-to-search
- [x] **3.2** `AiSearchPresetSelector` — 3-button segmented control (Strict / Neutral / Broad); ARIA labels
- [x] **3.3** `AiSearchViewTabs` — Notes / Chunks tab switcher; only shown when results exist (`noteGroups.length > 0`)
- [x] **3.4** `NoteSearchItem` — title, tags, score, top chunk snippet, expand/collapse with "+N hidden"
- [x] **3.5** `NoteSearchResults` — list with empty state referencing indexing
- [x] **3.6** `ChunkSearchItem` — note title, chunk text, score, "Open in context" button
- [x] **3.7** `ChunkSearchResults` — flattened chunk list (≤2 chunks/note)
- [x] **3.8** `Sidebar.tsx` — AI toggle, preset selector, view tabs, result routing; Enter triggers AI search; FTS debounce disabled when AI is ON (Enter triggers FTS immediately too)

### Phase 4: "Open in context" Navigation ✅

- [x] **4.1** `scrollToChunk(charOffset, chunkLength)` on `RichTextEditorHandle`
  - `doc.descendants()` walk accumulates block text lengths to map charOffset → PM position
  - `ChunkFocusExtension` (`extensions/ChunkFocus.ts`) applies `NodeDecoration` with `chunk-focus` CSS class; cleared on mousedown
  - *Deviation from design:* scroll uses native `el.scrollIntoView({ behavior: 'smooth', block: 'center' })` on the `.chunk-focus` DOM element (more reliable than `editor.commands.scrollIntoView()`)
  - *Added:* `pendingChunkScrollRef` queue in `RichTextEditor` handles TipTap `immediatelyRender: false` race — if called before editor is ready, deferred to `onCreate`
  - Fixed off-by-one: `>=` → `>` in block boundary comparison
- [x] **4.2** `handleOpenInContext` in `NotesShell` — `pendingScrollRef` pattern; 150ms timeout → `scrollToChunk` after note mounts
  - *Added:* async Supabase fallback for notes not in the paginated list (notes on unloaded pages)
  - try/catch + explicit column select on fallback fetch
- [x] **4.3** Different-note switch: `handleEditNote(note)` first, scroll deferred via `pendingScrollRef`

### Phase 5: Polish & Error Handling ✅

- [x] **5.1** Loading skeleton — 3 animated pulse bars in sidebar while AI search is in flight
- [x] **5.2** Error state — "AI Search unavailable" + Retry button (`aiRefetch`)
- [x] **5.3** Empty state — "No results. Try Broad mode or use … menu to index a note"
- [x] **5.4** Keyboard: Enter submits AI search; Enter on FTS when AI OFF triggers immediate search
  - *Partial:* Tab-through results and Enter on "Open in context" button not implemented — deferred post-MVP
- [x] **5.5** ARIA labels — toggle (`aria-label`), preset selector (`aria-label`), view tabs (`aria-label` per item)

---

## Newly Discovered / Out-of-Scope Work

| Task | Status | Notes |
|------|--------|-------|
| Commit `rag-search/deno.json` + `import_map.json` | ⚠️ blocking | Files exist locally, not tracked by git — required for Supabase deploy |
| Enter-to-search for FTS | ✅ done | Added as UX improvement; Enter fires FTS immediately (cancels debounce) |
| AI RAG Search rename + Info tooltip | ✅ done | Cosmetic: clearer branding + user guidance |
| Tab-through results (keyboard nav) | 🔵 deferred | Post-MVP — no blocking issue, buttons are already focusable |
| Automated tests for AI search + scroll | 🔵 deferred | No web unit test infrastructure yet; agreed to test manually for now |

---

## Dependencies

- `note_embeddings` table and `match_notes` RPC existed pre-feature; migration 1.1 extends with `filter_tag`
- Gemini API key stored in `user_api_keys` (reused from `rag-index`)
- Phase 4 depends on Phase 3 — all satisfied
- `ChunkFocusExtension` is new in this codebase; follows `prosemirrorCaret.ts` PM integration style

## Risks & Mitigation

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| Gemini embed latency > 2s | Medium | Medium | Loading skeleton shown immediately; Enter-trigger reduces unnecessary calls |
| `match_notes` returns too few results in Strict mode | Low | Low | User can switch to Broad |
| charOffset → PM position conversion breaks for rich content (lists, headings) | Low | Medium | Mitigated by `doc.descendants()` approach; lists/headings tested manually *(recommended)* |
| NodeDecoration not cleared on note switch | Low | Low | `pendingChunkScrollRef.current = null` on note switch; decoration cleared on mousedown |
| Dedup hides too many relevant chunks | Low | Medium | `OFFSET_DELTA_THRESHOLD` is a constant — tunable |
| `rag-search/deno.json` not committed | High | High | **Must commit before merge** |
