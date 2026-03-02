-- Enable pgvector extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store note embeddings for RAG
CREATE TABLE IF NOT EXISTS public.note_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,        -- plain text extracted from HTML (used in prompts)
  embedding  vector(3072) NOT NULL, -- Gemini gemini-embedding-001 produces 3072-dim vectors
  indexed_at timestamp with time zone DEFAULT now()
);

-- Enforce one embedding per note (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_note_id_idx
  ON public.note_embeddings (note_id);

CREATE INDEX IF NOT EXISTS note_embeddings_user_id_idx
  ON public.note_embeddings (user_id);

-- NOTE: HNSW index supports max 2000 dimensions; gemini-embedding-001 returns 3072.
-- For POC (small dataset): exact sequential scan via <=> is sufficient.
-- For production: consider reducing output_dimensionality to <=2000 and re-adding HNSW.
