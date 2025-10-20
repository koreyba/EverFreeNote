-- Create bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for note-images bucket

-- Users can upload to their own folder
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Images are publicly readable
CREATE POLICY "Images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-images');

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

