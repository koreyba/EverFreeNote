---
phase: testing
title: RAG Note Indexing UI — Testing Strategy
description: Test cases for per-note RAG indexing controls
---

# Testing Strategy

## Test Coverage Goals

- Unit tests: UI hooks/components with mocked Supabase client and mocked Function invoke
- Integration tests: `supabase.functions.invoke('rag-index', ...)` paths against test DB
- Manual: UI buttons, status polling, and error states for function actions

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

- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'index' } })`: returns 401 on missing/invalid auth
- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'index' } })`: returns 400 for invalid `noteId`
- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'index' } })`: returns `{ chunkCount: N }` on success
- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'reindex' } })`: aliases to full reindex flow and returns `{ chunkCount: N }`
- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'delete' } })`: removes chunks and returns `{ deleted: true }`
- [ ] `supabase.functions.invoke('rag-index', { body: { noteId, action: 'index' } })`: returns 400 for unsupported action or missing payload fields

## Component Tests (mocked API, no network)

File: `cypress/component/features/notes/RagIndexPanel.cy.tsx`

- [x] Unindexed state: shows `RAG Index`, `Delete Index` disabled, status `Not indexed`
- [x] Indexed state: shows `Re-index`, `Delete Index` enabled, status includes chunk count
- [x] Index action: invokes `supabase.functions.invoke('rag-index', { body: { noteId, action: 'index' } })`
- [x] Delete action: invokes `supabase.functions.invoke('rag-index', { body: { noteId, action: 'delete' } })`

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

## Test Coverage Results

| Category | Tests Passed | Tests Failed | Coverage |
|---|---:|---:|---|
| Unit | TBD | TBD | TBD |
| Integration | TBD | TBD | TBD |
| End-to-End | TBD | TBD | TBD |

## Outstanding Gaps

- [ ] Record latest run results in the table above
- [ ] Add integration coverage for error paths (Gemini/API failures)
- [ ] Add explicit RLS verification checks for `note_embeddings`
- [ ] Document any known flaky tests and stabilization plan
