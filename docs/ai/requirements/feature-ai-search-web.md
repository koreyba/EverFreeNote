---
phase: requirements
title: AI Search Web (RAG) — Requirements & Problem Understanding
description: Vector-based semantic search with Note View / Chunk View display modes
---

# Requirements & Problem Understanding

## Problem Statement

**What problem are we solving?**

Full-text search (FTS) only matches exact keywords and can miss semantically related notes. Users who write in natural language often cannot recall the exact words used in a note, causing relevant notes to be unfindable.

- **Affected users**: All EverFreeNote users with a Gemini API key configured.
- **Current situation**: Search is purely keyword-based (PostgreSQL FTS with ILIKE fallback). The vector infrastructure (`note_embeddings`, `match_notes` RPC) already exists and is partially built but not exposed in the main search UI.

## Goals & Objectives

### Primary Goals
- Expose vector (RAG) search through the main sidebar search interface.
- Display results in two modes: **Note View** (default) and **Chunk View**.
- Show relevance snippets (chunks) always, with a grouping/deduplication strategy to reduce visual noise.
- Provide a **3-state Strict ↔ Broad slider** (Strict / Neutral / Broad) with fixed top-K and similarity threshold presets.
- "Open in context": open a note and scroll to the matching chunk with a persistent left-border highlight.

### Secondary Goals
- Progressive disclosure: top snippet shown by default, "show more" expands up to 5 chunks per note.

### Non-Goals
- Hybrid FTS + vector mode (no blending of scores).
- ML-based clustering or re-ranking.
- Explainability panel (why was this chunk returned?).
- Manual note-level ranking overrides.
- AI Search on mobile (web only in MVP).

## User Stories & Use Cases

| ID | Story |
|----|-------|
| US-1 | As a user, I want to toggle AI Search ON/OFF so that I can choose between semantic search and fast keyword search. |
| US-2 | As a user searching with AI Search ON, I want to see notes ranked by semantic relevance, with a snippet showing the matched passage, so I can quickly judge relevance. |
| US-3 | As a user, I want to expand a note's entry to see up to 5 distinct matching fragments, so I can understand how deeply a note covers my topic. |
| US-4 | As a user, I want to switch to Chunk View to browse individual passages as standalone results without having to open each note. |
| US-5 | As a user, I want to click "Open in context" on any chunk to open the note and scroll directly to that passage with a persistent left-border highlight (cleared when I click elsewhere in the editor). |
| US-6 | As a user, I want to use a Strict ↔ Broad slider to narrow or widen results without manually editing my query. |
| US-7 | As a user whose notes are not yet indexed, I want a clear prompt to index them before AI Search is available. |

### Edge Cases
- Note has only 1 chunk → no "show more" button needed.
- All chunks of a note are too similar (offset delta < 300 chars) → deduplication hides them, "+N hidden" label shown.
- **Query is empty** → AI Search is ON but shows the regular full notes list (same as without search).
- Gemini API key not configured → toggle disabled with tooltip.
- **RAG returns 0 results** → show "No results found. Try adjusting the Strict ↔ Broad slider." (not an error state).
- **Gemini API error** (rate limit / quota / 5xx) → show error state "AI Search unavailable" with retry; toggle remains ON.
- **Partially indexed notes** → AI Search runs over only the indexed subset; no warning shown (silent partial coverage in MVP).

## Success Criteria (MVP)

| # | Criterion |
|---|-----------|
| 1 | AI Search toggle ON/OFF works; OFF reverts to existing FTS. |
| 2 | Note View shows results with title, tags, **score as percentage (e.g. 85%)**, and 1 top snippet per note. |
| 3 | "Show more" expands inline (accordion) to ≤ 5 deduplicated chunks; "+N hidden" shown if more exist. |
| 4 | Chunk View shows ≤ 2 chunks per note with title, text, score. |
| 5 | A 3-state Strict ↔ Broad slider (Strict / Neutral / Broad) adjusts top-K and similarity threshold using fixed presets. |
| 6 | "Open in context" opens note, scrolls to, and shows persistent left-border highlight on the matching chunk (cleared on next click in editor). |
| 7 | When no notes are indexed, a clear prompt is shown to the user with a link to RagIndexPanel. |

## Constraints & Assumptions

### Technical Constraints
- Vector infrastructure already in place: `note_embeddings` table, HNSW index, `match_notes` RPC.
- Embedding queries go through a Supabase Edge Function (`rag-search` — to be created).
- Deduplication uses **offset delta = 300 chars** between accepted chunks.
- Active **tag filter** is applied **on the DB side** via a new `filter_tag TEXT DEFAULT NULL` parameter added to `match_notes` (new migration), consistent with how `search_notes_fts` handles `filter_tag = ANY(n.tags)`.
- No new ML dependencies; pure pgvector cosine distance.

### Assumptions
- Notes must be indexed (have entries in `note_embeddings`) before AI Search works.
- The existing `match_notes` SQL function is the primary retrieval mechanism; top-K and threshold adjustments are passed as parameters.
- "Open in context" relies on `char_offset` stored in `note_embeddings` to scroll the editor.

## Questions & Open Items

| # | Question | Status |
|---|----------|--------|
| Q1 | What is the offset delta threshold for deduplication? | **Resolved: 300 chars** |
| Q2 | What are the Strict/Broad slider's exact top-K and threshold values? | **Resolved: 3 fixed states — Strict=5/0.75, Neutral=15/0.55, Broad=30/0.40** |
| Q3 | Should AI Search results also respect the active tag filter? | **Resolved: Yes — tag filter is applied** |
| Q4 | Does "Open in context" need to work on mobile or only web? | **Resolved: Web only (MVP)** |
| Q5 | What happens when the note editor is already open to a different note? | **Resolved: Replace current note** |
| Q6 | Score display format? | **Resolved: percentage — e.g. 85%** |
| Q7 | "Show more" UX in Note View? | **Resolved: inline accordion (expand in place)** |
| Q8 | Chunk highlight style in editor after "Open in context"? | **Resolved: permanent left border stripe, cleared on next user click elsewhere** |
| Q9 | Tag filter location? | **Resolved: DB-side via new `filter_tag` param in `match_notes` RPC (new migration)** |
| Q10 | Empty query behavior with AI Search ON? | **Resolved: show regular full notes list** |
