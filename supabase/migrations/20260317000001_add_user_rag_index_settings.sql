CREATE TABLE IF NOT EXISTS public.user_rag_index_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_chunk_size integer NOT NULL DEFAULT 500,
  min_chunk_size integer NOT NULL DEFAULT 200,
  max_chunk_size integer NOT NULL DEFAULT 1500,
  overlap integer NOT NULL DEFAULT 100,
  use_title boolean NOT NULL DEFAULT true,
  use_section_headings boolean NOT NULL DEFAULT true,
  use_tags boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_rag_index_settings_target_chunk_size_range CHECK (target_chunk_size BETWEEN 50 AND 5000),
  CONSTRAINT user_rag_index_settings_min_chunk_size_range CHECK (min_chunk_size BETWEEN 50 AND 5000),
  CONSTRAINT user_rag_index_settings_max_chunk_size_range CHECK (max_chunk_size BETWEEN 50 AND 5000),
  CONSTRAINT user_rag_index_settings_overlap_range CHECK (overlap BETWEEN 0 AND 5000),
  CONSTRAINT user_rag_index_settings_ordering CHECK (min_chunk_size <= target_chunk_size AND target_chunk_size <= max_chunk_size)
);

ALTER TABLE public.user_rag_index_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_index_settings' AND policyname = 'Users can view own rag index settings'
  ) THEN
    CREATE POLICY "Users can view own rag index settings"
      ON public.user_rag_index_settings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_index_settings' AND policyname = 'Users can insert own rag index settings'
  ) THEN
    CREATE POLICY "Users can insert own rag index settings"
      ON public.user_rag_index_settings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_index_settings' AND policyname = 'Users can update own rag index settings'
  ) THEN
    CREATE POLICY "Users can update own rag index settings"
      ON public.user_rag_index_settings FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_index_settings' AND policyname = 'Users can delete own rag index settings'
  ) THEN
    CREATE POLICY "Users can delete own rag index settings"
      ON public.user_rag_index_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
