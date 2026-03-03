-- Create/update note_embeddings to chunked schema with 1536-dim vectors.
-- Non-destructive strategy:
--   1) ensure pgvector extension exists
--   2) keep legacy table as backup (rename once, when upgrading older schema)
--   3) create new chunked table if missing
--   4) create required indexes idempotently
--
-- Note: legacy 3072-dim vectors cannot be transformed to 1536 automatically.
-- Re-indexing is required to populate the new table.

CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'note_embeddings'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'note_embeddings_legacy_3072'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'note_embeddings'
      AND column_name = 'chunk_index'
  ) THEN
    ALTER TABLE public.note_embeddings RENAME TO note_embeddings_legacy_3072;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.note_embeddings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index  int  NOT NULL,  -- ordinal position of chunk within note (0-based)
  char_offset  int  NOT NULL,  -- character offset in source plain text (for UI highlighting)
  content      text NOT NULL,  -- plain text of this chunk (title + body fragment)
  embedding    vector(1536) NOT NULL,
  indexed_at   timestamp with time zone DEFAULT now()
);

-- Upsert target: one embedding per chunk per note
CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_note_chunk_idx
  ON public.note_embeddings (note_id, chunk_index);

CREATE INDEX IF NOT EXISTS note_embeddings_user_id_idx
  ON public.note_embeddings (user_id);

-- HNSW index for fast approximate cosine similarity search
-- m=16: connections per node (higher = better recall, more memory)
-- ef_construction=64: build-time accuracy (higher = better quality, slower build)
CREATE INDEX IF NOT EXISTS note_embeddings_embedding_hnsw_idx
  ON public.note_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
