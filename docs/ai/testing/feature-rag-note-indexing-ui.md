---
phase: testing
title: RAG Note Indexing UI — Testing Strategy
description: Test cases for per-note RAG indexing controls
---

# Testing Strategy

## Test Coverage Goals

- Unit tests: `chunker.ts`, `ragIndexService.ts` (mocked Gemini + Supabase)
- Integration tests: API route (`POST`, `DELETE`) with test DB
- Manual: UI buttons, status polling, error states

## Unit Tests

### `chunker.ts`
- [ ] `stripHtml`: removes tags, collapses whitespace
- [ ] `stripHtml`: handles empty string
- [ ] `chunkText`: single chunk when text < chunkSize
- [ ] `chunkText`: splits correctly with overlap (verify charOffset values)
- [ ] `chunkText`: last chunk is shorter than chunkSize

### `ragIndexService.ts` (mocked deps)
- [ ] `indexNote`: deletes existing chunks before inserting new ones
- [ ] `indexNote`: returns correct chunkCount
- [ ] `indexNote`: throws on Gemini error (no partial data written)
- [ ] `deleteNoteIndex`: deletes all chunks for note_id + user_id

## Integration Tests

- [ ] `POST /api/notes/[id]/rag`: returns 401 without auth
- [ ] `POST /api/notes/[id]/rag`: returns 400 for non-existent note
- [ ] `POST /api/notes/[id]/rag`: successfully indexes note, returns `{ chunkCount: N }`
- [ ] `POST /api/notes/[id]/rag` (reindex): replaces old chunks, count reflects new content
- [ ] `DELETE /api/notes/[id]/rag`: removes all chunks, returns `{ deleted: true }`
- [ ] `DELETE /api/notes/[id]/rag`: returns 401 without auth

## Component Tests (mocked API, no network)

File: `cypress/component/features/notes/RagIndexPanel.cy.tsx`

- [x] Unindexed state: shows `RAG Index`, `Delete Index` disabled, status `Not indexed`
- [x] Indexed state: shows `Re-index`, `Delete Index` enabled, status includes chunk count
- [x] Index action: invokes `supabase.functions.invoke('rag-index', { action: 'index' })`
- [x] Delete action: invokes `supabase.functions.invoke('rag-index', { action: 'delete' })`

## End-to-End Tests (manual)

- [ ] Open a note in editor → "RAG Index" button visible
- [ ] Click "RAG Index" → button shows spinner → status updates to "N chunks"
- [ ] "Delete RAG Index" becomes enabled after indexing
- [ ] Click "Delete RAG Index" → status returns to "Not indexed", delete button disables
- [ ] Click "RAG Index" again → reindex works, chunk count may differ
- [ ] Open same note in view mode → same buttons and status present
- [ ] Status indicator refreshes without page reload (polling)

## Manual Testing

- [ ] Test with a short note (< 1500 chars → 1 chunk)
- [ ] Test with a long note (> 3000 chars → multiple chunks)
- [ ] Test with a note that has only a title (empty body)
- [ ] Verify `char_offset` values in DB are correct

## Test Data

- Use the existing local Supabase instance with test@example.com user
- Notes already in DB (782 notes) are sufficient for testing
