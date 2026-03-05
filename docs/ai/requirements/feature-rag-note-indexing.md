---
phase: requirements
title: RAG Note Indexing
description: Requirements for per-note indexing, retrieval, and UI controls
---

# RAG Note Indexing

## Problem Statement

- Full-text search (FTS) does not cover semantic search well: users often remember intent, not exact words.
- The system must index notes into a vector store quickly and use them safely in the RAG flow.
- Users must clearly see indexing status per note and control indexing from the UI.

## Goals

- Index notes into chunks and embeddings via the Supabase Edge Function `rag-index`.
- Support UI actions: `index`, `reindex`, `delete`.
- Support automatic reindexing after content changes (debounced autosave path).
- Enforce data isolation between users (RLS + `user_id` filtering).
- Ensure production-ready behavior: fault tolerance, idempotency, and observability.

## In Scope

- UI integration in `NoteEditor` and `NoteView` (RAG index status and action controls).
- Calls to `supabase.functions.invoke('rag-index', { body: { noteId, action } })`.
- Chunk-level indexing (multiple vectors per note) and storage in `note_embeddings`.
- Multi-user support with strict access protection for `note_embeddings`.
- Staging/production deployment with required migrations and Edge Function secrets.

## Out of Scope

- Indexing of attachments/images/OCR.
- Cross-project/global knowledge graph.
- On-device offline inference.

## Success Criteria

- [ ] `index`/`reindex`/`delete` work correctly per note without UI desynchronization.
- [ ] After note edits, index updates automatically and does not lose data on transient failures.
- [ ] `note_embeddings` remains inaccessible to other users (RLS verified).
- [ ] Edge Function does not log sensitive upstream payloads and handles retries/timeouts correctly.

## Constraints & Assumptions

- Embeddings model: `models/gemini-embedding-001` with `outputDimensionality=1536`.
- Index is stored in `public.note_embeddings` with chunk-level structure (`chunk_index`, `char_offset`, `content`, `embedding`).
- Supabase service role key is stored only in Edge Function secrets, never in web `.env`.
- Client actions run through an authenticated Supabase session.
