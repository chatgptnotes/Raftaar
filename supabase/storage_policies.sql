-- ================================================
-- STORAGE BUCKET POLICIES
-- Project: Raftaar (Ambulance Management System)
-- ================================================

-- NOTE: First create the bucket 'driver-files' in Supabase Dashboard
-- Storage > New Bucket > Name: driver-files > Public: Yes

-- ================================================
-- STORAGE POLICIES FOR 'driver-files' BUCKET
-- ================================================

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'driver-files');

-- Allow public access to view files
CREATE POLICY "Allow public to view files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'driver-files');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'driver-files');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'driver-files');

-- ================================================
-- SETUP INSTRUCTIONS
-- ================================================

-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt
-- 2. Navigate to Storage
-- 3. Click "New bucket"
-- 4. Bucket name: driver-files
-- 5. Set as Public: Yes
-- 6. Click "Create bucket"
-- 7. Then run this SQL in SQL Editor to add policies
