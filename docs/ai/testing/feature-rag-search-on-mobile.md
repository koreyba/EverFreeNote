---
phase: testing
title: RAG Search on Mobile — Testing Strategy
description: Test checklist for mobile RAG indexing menu and settings redesign
---

# Testing Strategy

## Unit Tests

### `useRagStatus` (mobile hook)
- [ ] Returns `{ chunkCount: 0, isLoading: false }` when `noteId` is undefined
- [ ] Returns `{ chunkCount: 0, isLoading: false }` when `user` is null
- [ ] Calls `client.from('note_embeddings').select(...)` with correct `note_id` and `user_id`
- [ ] Returns correct `chunkCount` from query result
- [ ] Returns latest `indexedAt` from multiple rows
- [ ] `refresh()` triggers a re-fetch (increments tick)
- [ ] Cleans up interval on unmount

### `NoteIndexMenu`
- [ ] Renders correctly when `chunkCount === 0` ("Index note" enabled, "Remove" disabled)
- [ ] Renders correctly when `chunkCount > 0` ("Re-index note" enabled, "Remove" enabled)
- [ ] Calls `client.functions.invoke('rag-index', { body: { noteId, action: 'index' } })` on Index tap
- [ ] Calls `client.functions.invoke('rag-index', { body: { noteId, action: 'reindex' } })` on Re-index tap
- [ ] Shows confirmation modal before delete
- [ ] Calls delete action after confirmation
- [ ] Shows error toast on invoke failure

### `GeminiApiKeySection`
- [ ] Calls `ApiKeysSettingsService.getStatus()` on modal open
- [ ] Shows "Configured" badge when `configured === true`
- [ ] Shows "Not configured" when `configured === false`
- [ ] Save calls `ApiKeysSettingsService.upsert(key)` with trimmed key
- [ ] Shows success message after save
- [ ] Shows error message on failure

## Manual QA Checklist

### Note overflow menu
- [ ] `⋮` button visible in note editor header
- [ ] Tapping opens bottom sheet
- [ ] Status line shows correct chunk count and timestamp (or "Not indexed")
- [ ] "Index note" / "Re-index note" label correct based on status
- [ ] Tap outside the sheet closes it
- [ ] Indexing spinner shows during operation
- [ ] Success toast appears after indexing
- [ ] Error toast appears on failure (e.g. no API key)
- [ ] Confirm modal appears before delete
- [ ] After delete, status resets to "Not indexed"

### Settings screen
- [ ] 4 sections visible: APPEARANCE, INTEGRATIONS, DATA, ACCOUNT
- [ ] Theme selection still works
- [ ] Google / Gemini API row opens modal
- [ ] Modal loads status correctly (Configured / Not configured)
- [ ] Can enter and save a new API key
- [ ] WordPress row shows "Soon" badge and is non-interactive
- [ ] Import / Export rows show "Soon" badge and are non-interactive
- [ ] Sign Out works
- [ ] Delete Account modal still works
