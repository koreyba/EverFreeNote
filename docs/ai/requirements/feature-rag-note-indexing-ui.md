---
phase: requirements
title: RAG Note Indexing UI
description: Per-note RAG index controls integrated into the web note editor/viewer
---

# Requirements & Problem Understanding

## Problem Statement

RAG indexing for notes is currently only possible via a standalone CLI script (`scripts/rag-poc/index.ts`). There is no way for users to trigger or manage indexing of individual notes from the UI.

- **Affected users:** EverFreeNote web users who want to use AI-assisted note search (future) and the developer testing the RAG pipeline.
- **Current workaround:** Run `npx ts-node index.ts` manually — indexes a hardcoded subset of notes, no per-note control.
- **Pain:** Cannot selectively index, re-index, or remove a note from the vector index through the UI.

## Goals & Objectives

### Primary goals
- Add "RAG Index" button to each note in the web editor and view
- Add "Delete RAG Index" button (disabled when note has no index)
- Show live indexing status (chunk count) with polling every 3 seconds

### Secondary goals
- Reindexing (pressing "RAG Index" on an already-indexed note) should work cleanly (delete + reindex)
- Status must reflect actual DB state, not just local UI state

### Non-goals (explicitly out of scope)
- Mobile app (iOS/Android) — web only
- Bulk indexing of all notes
- RAG search UI — separate feature
- MCP server — separate feature
- Automatic indexing on note save

## User Stories & Use Cases

- **As a user**, I want to click "RAG Index" on a note so that it becomes searchable via AI.
- **As a user**, I want to click "RAG Index" again on an already-indexed note so that it gets re-indexed after edits.
- **As a user**, I want to click "Delete RAG Index" to remove a note from the AI index.
- **As a user**, I want to see how many chunks a note has been split into so that I understand its index state.
- **As a user**, I want the "Delete RAG Index" button to be disabled when no index exists so that I don't make mistakes.

### Edge cases
- Indexing fails (Gemini API error, rate limit) → show error state, don't leave partial data
- Note has no content → indexing still runs but may produce 0 chunks
- User triggers reindex while previous indexing is in progress → debounce / disable button during indexing

## Success Criteria

- [ ] "RAG Index" button appears in NoteEditor and NoteView headers
- [ ] Clicking "RAG Index" successfully indexes the note into `note_embeddings` with correct chunks
- [ ] "Delete RAG Index" button is disabled when `chunk_count = 0`
- [ ] Clicking "Delete RAG Index" removes all chunks for the note
- [ ] Status indicator updates every 3 seconds showing current chunk count
- [ ] Reindexing (delete old + insert new) works atomically
- [ ] Buttons are disabled during in-progress operations (no double-submit)
- [ ] Errors are shown to user (toast or inline message)

## Constraints & Assumptions

### Technical constraints
- `GEMINI_API_KEY` is a server-side secret → indexing must go through a Supabase Edge Function, not a browser-only call
- The app is a static SPA (`output: 'export'`) — Next.js API routes don't exist in the build; Supabase Edge Functions are used instead
- Gemini free tier: 5 RPM / 20 RPD → indexing a single note is fast but repeated calls may hit rate limits
- `vector(1536)` schema and HNSW index already applied (migration `20260302000002`)
- Chunking: 1500 chars, overlap 200, title + content

### Assumptions
- The authenticated user's Supabase session is available browser-side for status polling
- `GEMINI_API_KEY` is set as a Supabase secret (`supabase secrets set GEMINI_API_KEY=...`)
- `SUPABASE_SERVICE_ROLE_KEY` is auto-injected into Edge Functions by Supabase infrastructure
- `note_embeddings` is readable via anon key + user session, with RLS restricting reads to `auth.uid() = user_id`

## Questions & Open Items

- None — requirements are fully specified. Search and MCP are out of scope for this feature.
