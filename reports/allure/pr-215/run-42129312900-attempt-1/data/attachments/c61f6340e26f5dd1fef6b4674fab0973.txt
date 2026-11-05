-- Enable Row Level Security on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes table (idempotent version)
-- Users can view only their own notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own notes') THEN
    CREATE POLICY "Users can view own notes"
        ON public.notes
        FOR SELECT
        USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own notes') THEN
    CREATE POLICY "Users can insert own notes"
        ON public.notes
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notes') THEN
    CREATE POLICY "Users can update own notes"
        ON public.notes
        FOR UPDATE
        USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own notes') THEN
    CREATE POLICY "Users can delete own notes"
        ON public.notes
        FOR DELETE
        USING (auth.uid() = user_id);
  END IF;
END $$;

