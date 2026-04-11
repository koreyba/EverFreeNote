---
phase: planning
title: RAG Note Indexing UI — Planning
description: Task breakdown for per-note RAG indexing controls
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Edge Function indexing API working
- [x] Milestone 2: RagIndexPanel component renders with live status
- [x] Milestone 3: Integrated into NoteEditor and NoteView, end-to-end working

## Task Breakdown

### Phase 1: Server-side infrastructure

- [x] **1.1** Port chunking logic into `ui/web/lib/rag/chunker.ts`
  - `stripHtml(html): string` — regex-based, no extra deps
  - `chunkText(text, chunkSize=1500, overlap=200): Array<{content, charOffset}>`
  - `prepareNoteText(title, html)` — prepend title before chunking

- [x] **1.2** Create embedding wrapper `ui/web/lib/rag/embeddings.ts`
  - Direct Gemini REST API via `fetch` (no extra npm packages)
  - `batchEmbedContents` endpoint, `output_dimensionality: 1536`
  - model: `models/gemini-embedding-001`

- [x] **1.3** Create `ui/web/lib/rag/ragIndexService.ts`
  - `indexNote(noteId, userId, serviceClient)` — fetch note, chunk, embed, delete old, insert new
  - `deleteNoteIndex(noteId, userId, serviceClient)` — delete all chunks
  - (Retained for future Node.js/testing use; production uses Edge Function)

- [x] **1.4** Create Supabase Edge Function `supabase/functions/rag-index/index.ts`
  - Body: `{ noteId: string, action: 'index' | 'reindex' | 'delete' }`
  - JWT auth via Authorization header + service role client
  - Chunking + Gemini embedding logic self-contained (Deno-compatible, via fetch)
  - ~~Next.js API route~~ — not applicable (static SPA, `output: 'export'`)

- [x] **1.5** Add env vars to `.env.example`
  - `GEMINI_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Phase 2: Frontend

- [x] **2.1** Create `ui/web/hooks/useRagStatus.ts`
  - Polls `note_embeddings` every 3 seconds via Supabase browser client
  - Returns `{ chunkCount, indexedAt, isLoading }`
  - Cleans up interval on unmount

- [x] **2.2** Create `ui/web/components/features/notes/RagIndexPanel.tsx`
  - "RAG Index" / "Re-index" button with spinner
  - "Delete Index" button (disabled when chunkCount === 0)
  - Status: "Not indexed" / "Indexing..." / "N chunks · HH:MM:SS" / "Removing..."
  - Calls `supabase.functions.invoke('rag-index', { body: { noteId, action } })`
  - Error handling via `sonner` toasts

- [x] **2.3** Integrate `RagIndexPanel` into `NoteEditor.tsx`
  - Added to header alongside Save/Read buttons (only when noteId present)

- [x] **2.4** Integrate `RagIndexPanel` into `NoteView.tsx`
  - Added to header alongside Edit/Delete buttons

### Phase 3: Polish & Error handling ✅

- [x] **3.1** Error handling in Edge Function (catch Gemini errors, return HTTP 500 with message)
- [x] **3.2** Error toasts in `RagIndexPanel` via `sonner`
- [x] **3.3** Buttons disabled during in-progress operations

## Dependencies

- Migrations `20260302000002` and `20260302000003` already applied ✅
- No new npm packages needed (Gemini via REST fetch, HTML strip via regex) ✅
- `GEMINI_API_KEY` must be set as Supabase secret: `supabase secrets set GEMINI_API_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY` auto-injected in Edge Functions (no manual config needed)

## Deploy checklist

- [ ] `supabase secrets set GEMINI_API_KEY=<key>` (production)
- [ ] `supabase functions deploy rag-index`
- [ ] Test locally: `supabase functions serve rag-index --env-file .env.local`

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemini rate limit during testing | Medium | Single-note = 1 `batchEmbedContents` call; 5 RPM free tier |
| Edge Function cold start | Low | Supabase Edge Functions warm up fast (<200ms) |
| Note content too large → slow indexing | Low | Chunking; Gemini batch call handles all chunks in one request |
