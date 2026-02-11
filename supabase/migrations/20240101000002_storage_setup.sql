-- Storage bucket setup for WorkLunch
-- This creates the storage bucket for post photos

-- Create the post-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-photos', 'post-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-photos bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to photos
CREATE POLICY "Public can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-photos');
