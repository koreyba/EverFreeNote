-- Ensure pgcrypto is available (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update default UUID generator for notes.id
ALTER TABLE IF EXISTS public.notes
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
