DO $$
DECLARE
  v_default_embedding_model constant text := 'models/gemini-embedding-001';
  v_embedding_model_check constant text := format(
    'embedding_model IN (%L, %L)',
    v_default_embedding_model,
    'models/gemini-embedding-2-preview'
  );
BEGIN
  EXECUTE format(
    'ALTER TABLE public.user_rag_index_settings ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT %L',
    v_default_embedding_model
  );

  EXECUTE format(
    'ALTER TABLE public.user_rag_search_settings ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT %L',
    v_default_embedding_model
  );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_index_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_index_settings'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.user_rag_index_settings ADD CONSTRAINT user_rag_index_settings_embedding_model_check CHECK (%s)',
      v_embedding_model_check
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_search_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_search_settings'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.user_rag_search_settings ADD CONSTRAINT user_rag_search_settings_embedding_model_check CHECK (%s)',
      v_embedding_model_check
    );
  END IF;
END
$$;

/*
Down (manual rollback)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_index_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_index_settings'::regclass
  ) THEN
    ALTER TABLE public.user_rag_index_settings
      DROP CONSTRAINT IF EXISTS user_rag_index_settings_embedding_model_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rag_search_settings_embedding_model_check'
      AND conrelid = 'public.user_rag_search_settings'::regclass
  ) THEN
    ALTER TABLE public.user_rag_search_settings
      DROP CONSTRAINT IF EXISTS user_rag_search_settings_embedding_model_check;
  END IF;

  ALTER TABLE public.user_rag_index_settings
    DROP COLUMN IF EXISTS embedding_model;

  ALTER TABLE public.user_rag_search_settings
    DROP COLUMN IF EXISTS embedding_model;
END
$$;
*/
