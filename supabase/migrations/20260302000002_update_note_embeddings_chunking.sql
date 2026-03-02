-- Migrate note_embeddings to chunked schema with 1536-dim vectors
-- Decisions:
--   - vector(1536) via output_dimensionality → HNSW now fits (limit 2000)
--   - 1 note = N chunks (chunk_index, char_offset)
--   - HNSW index with cosine metric

DROP TABLE IF EXISTS public.note_embeddings;

CREATE TABLE public.note_embeddings (
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
CREATE UNIQUE INDEX note_embeddings_note_chunk_idx
  ON public.note_embeddings (note_id, chunk_index);

CREATE INDEX note_embeddings_user_id_idx
  ON public.note_embeddings (user_id);

-- HNSW index for fast approximate cosine similarity search
-- m=16: connections per node (higher = better recall, more memory)
-- ef_construction=64: build-time accuracy (higher = better quality, slower build)
CREATE INDEX note_embeddings_embedding_hnsw_idx
  ON public.note_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
