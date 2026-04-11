ALTER TABLE public.user_rag_index_settings
ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'models/gemini-embedding-001';

ALTER TABLE public.user_rag_search_settings
ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'models/gemini-embedding-001';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_index_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_index_settings'::regclass
  ) THEN
    ALTER TABLE public.user_rag_index_settings
    ADD CONSTRAINT user_rag_index_settings_embedding_model_check
    CHECK (embedding_model IN ('models/gemini-embedding-001', 'models/gemini-embedding-2-preview'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_search_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_search_settings'::regclass
  ) THEN
    ALTER TABLE public.user_rag_search_settings
    ADD CONSTRAINT user_rag_search_settings_embedding_model_check
    CHECK (embedding_model IN ('models/gemini-embedding-001', 'models/gemini-embedding-2-preview'));
  END IF;
END
$$;
