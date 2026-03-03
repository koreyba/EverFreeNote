---
phase: implementation
title: RAG Note Indexing - Implementation Guide (POC)
description: Technical notes from POC indexing scripts, aligned with current chunked schema
---

# RAG Note Indexing - Implementation Guide (POC)

> This document captures POC script work (`scripts/rag-poc`) and is aligned with the
> current chunked embeddings model (`vector(1536)`). The production indexing path is
> implemented in `supabase/functions/rag-index/index.ts`.

## Development Setup

### Prerequisites

- Node.js 20+
- Supabase with pgvector enabled
- Gemini API key
- Migrations applied

### Install

```bash
cd scripts/rag-poc
npm install
cp .env.example .env
```

### Environment

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
RAG_USER_ID=...
```

## File Structure

```text
scripts/rag-poc/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── config.ts
├── index.ts
├── query.ts
└── lib/
    ├── supabase.ts
    ├── html-utils.ts
    └── embeddings.ts
```

## Implementation Notes

### `config.ts`

```ts
export const RAG_CONFIG = {
  // Embedding
  embeddingModel: "models/gemini-embedding-001",
  embeddingDimensions: 1536,

  // LLM
  llmModel: "gemini-2.0-flash",
  llmTemperature: 0.2,

  // Retrieval
  matchCount: 8,

  // Chunking and indexing
  chunkSize: 1500,
  chunkOverlap: 200,
  batchSize: 16,
  batchDelayMs: 300,
  maxContentChars: 24000,

  // HNSW (migration settings)
  hnswM: 16,
  hnswEfConstruction: 64,
} as const
```

### `index.ts` flow

1. Fetch notes (`id`, `title`, `description`)
2. Strip HTML to plain text
3. Build note text and split into chunks
4. Generate embeddings for chunks
5. Upsert into `note_embeddings` by `(note_id, chunk_index)`
6. Delete stale tail chunks after successful upsert

### `query.ts` flow

1. Read CLI question
2. Embed query
3. Call `match_notes` RPC
4. Build prompt from matched chunks
5. Call `ChatGoogleGenerativeAI` with `gemini-2.0-flash`
6. Print answer and sources

Prompt template example:

```text
You are an assistant that answers questions using only the provided user notes.

Context:
---
{context}
---

Question: {question}

If context is insufficient, say that explicitly.
```

## Supabase Migrations

### `note_embeddings`

```sql
CREATE TABLE IF NOT EXISTS public.note_embeddings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index  int NOT NULL,
  char_offset  int NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536) NOT NULL,
  indexed_at   timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_note_chunk_idx
  ON public.note_embeddings (note_id, chunk_index);

CREATE INDEX IF NOT EXISTS note_embeddings_user_id_idx
  ON public.note_embeddings (user_id);
```

### `match_notes` RPC

```sql
CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_user_id   uuid,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  note_id      uuid,
  chunk_index  int,
  char_offset  int,
  content      text,
  similarity   float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    note_id,
    chunk_index,
    char_offset,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 100));
$$;
```

## Known Limitations

- POC scripts are not the deployment path
- Service-role usage in local scripts is for local experimentation only
- Operational reliability and retries are handled in Edge Functions, not in this script doc
