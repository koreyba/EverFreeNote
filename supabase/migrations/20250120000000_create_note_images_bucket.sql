-- Create bucket for note images (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for note-images bucket (idempotent version)

-- Users can upload to their own folder
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own images') THEN
    CREATE POLICY "Users can upload their own images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'note-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Images are publicly readable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Images are publicly readable') THEN
    CREATE POLICY "Images are publicly readable"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'note-images');
  END IF;
END $$;

-- Users can delete their own images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own images') THEN
    CREATE POLICY "Users can delete their own images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'note-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

