---
phase: implementation
title: RAG Note Indexing UI - Implementation Guide
description: Technical notes for per-note RAG controls implemented with Supabase Edge Functions
---

# Implementation Guide

## Current Architecture

RAG indexing for web notes is implemented through Supabase Edge Function `supabase/functions/rag-index/index.ts`.

- Browser UI triggers `supabase.functions.invoke('rag-index', { body: { noteId, action } })`
- Edge Function performs auth validation, chunking, embedding, and DB writes
- Edge Function resolves the indexing embedding model from `user_rag_index_settings.embedding_model`
- Browser polls `note_embeddings` via `useRagStatus.ts` for live status

The old Next.js API route flow is not used.

- `app/api/notes/[id]/rag/route.ts`: legacy/stale reference, not the active path
- `ui/web/lib/rag/chunker.ts`: legacy/stale reference
- `ui/web/lib/rag/embeddings.ts`: legacy/stale reference
- `ui/web/lib/rag/ragIndexService.ts`: legacy/stale reference

## Development Setup

1. Use project root env for browser-safe values only:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. Configure Edge Function secrets in Supabase (server-side only):
   ```bash
   supabase secrets set GEMINI_API_KEY=...
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Serve function locally with env file:
   ```bash
   supabase functions serve rag-index --env-file .env.local
   ```

`SUPABASE_SERVICE_ROLE_KEY` must never be placed in a web-facing `.env` file such as `ui/web/.env.local`.
It is read inside the function with:

```ts
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
```

## Code Structure (Current)

```text
supabase/functions/rag-index/
  index.ts                <- Edge Function (auth + chunk + embed + upsert/cleanup)

ui/web/hooks/
  useRagStatus.ts         <- Polling of note_embeddings status for one note

ui/web/components/features/notes/
  RagIndexPanel.tsx       <- Index/Re-index/Delete Index controls
  NoteEditor.tsx          <- Renders RagIndexPanel in editor header
  NoteView.tsx            <- Renders RagIndexPanel in read view header
```

## Edge Function Details

File: `supabase/functions/rag-index/index.ts`

### action = index

1. Validate JWT and resolve `userId`
2. Load note content from `notes`
3. Convert HTML to plain text and split into chunks
4. Load the persisted indexing embedding-model preset
5. Call Gemini `batchEmbedContents`
6. Upsert new chunks by `(note_id, chunk_index)`
7. Delete stale tail chunks (`chunk_index >= newChunkCount`)
8. Return an explicit semantic result:
   - `{ outcome: "indexed", chunkCount, droppedChunks?, debugChunks? }`
   - `{ outcome: "skipped", reason: "too_short", chunkCount: 0, message }` when the note is too short and embeddings are cleared

### action = delete

1. Validate JWT and resolve `userId`
2. Delete rows from `note_embeddings` by `note_id` and `user_id`
3. Return `{ outcome: "deleted", deleted: true }`

## Client Integration

### `useRagStatus.ts`

- Poll interval: 3 seconds
- Query:
  ```ts
  supabase
    .from("note_embeddings")
    .select("chunk_index, indexed_at")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
  ```
- Derives:
  - `chunkCount`
  - `indexedAt`
  - `isLoading`

### `RagIndexPanel.tsx`

- Invokes:
  ```ts
  supabase.functions.invoke("rag-index", { body: { noteId, action: "index" } })
  supabase.functions.invoke("rag-index", { body: { noteId, action: "delete" } })
  ```
- UI states:
  - Not indexed
  - Indexing
  - Indexed
  - Deleting
- Uses the shared parser in `core/rag/indexResult.ts` so `200 OK` semantic skips are surfaced honestly instead of being treated as success

### `AIIndexNoteRow.tsx` and `NoteIndexMenu.tsx`

- Reuse the same normalized `rag-index` outcome contract
- Only apply optimistic/status success states when the function explicitly reports `outcome: "indexed"`
- Treat `reason: "too_short"` as a semantic non-success and keep the note in `not_indexed`

### `NoteEditor.tsx` and `NoteView.tsx`

- `NoteEditor.tsx`: renders panel when `noteId` exists
- `NoteView.tsx`: renders panel for viewed note id

## Error Handling

- Edge Function returns:
  - `400` invalid input
  - `401` unauthorized
  - `404` note not found
  - `500` embedding or DB errors
- `RagIndexPanel.tsx` displays toast errors for failed index/delete actions

## Notes for Reviewers

- Active implementation is `supabase/functions/rag-index`
- References to `route.ts` and `ragIndexService.ts` are intentionally marked as legacy in this guide
- Status and action wiring should be reviewed in:
  - `useRagStatus.ts`
  - `RagIndexPanel.tsx`
  - `NoteEditor.tsx`
  - `NoteView.tsx`
