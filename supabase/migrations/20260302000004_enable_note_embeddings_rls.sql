-- Enable Row Level Security for note_embeddings before browser-side reads.
ALTER TABLE public.note_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read only their own embeddings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'note_embeddings'
      AND policyname = 'Users can view own note embeddings'
  ) THEN
    CREATE POLICY "Users can view own note embeddings"
      ON public.note_embeddings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
