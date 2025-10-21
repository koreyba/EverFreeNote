-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notes table
-- user_id references auth.users(id) - Supabase Auth manages users
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Untitled',
    description TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes(updated_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (idempotent)
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

