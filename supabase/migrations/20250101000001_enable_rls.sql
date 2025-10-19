-- Enable Row Level Security on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes table
-- Users can view only their own notes
CREATE POLICY "Users can view own notes"
    ON public.notes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
    ON public.notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
    ON public.notes
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
    ON public.notes
    FOR DELETE
    USING (auth.uid() = user_id);

