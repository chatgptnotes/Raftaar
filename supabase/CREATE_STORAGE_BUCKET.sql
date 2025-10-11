-- ================================================
-- CREATE STORAGE BUCKET FOR DRIVER FILES
-- ================================================
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-files', 'driver-files', true)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STORAGE POLICIES
-- ================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

-- Policy 1: Allow public read access to all files
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-files');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-files');

-- Policy 3: Allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-files' AND auth.uid()::text = owner::text);

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-files' AND auth.uid()::text = owner::text);

-- ================================================
-- SUCCESS!
-- ================================================
-- Bucket 'driver-files' has been created with public access
-- Now you can upload files from your application
-- ================================================
