-- ================================================
-- FIX: Database error saving new user
-- ================================================
-- This fixes the RLS policy that blocks user creation
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;

-- Create separate policies for different operations
-- 1. Allow service_role (triggers) to insert new users
CREATE POLICY "Service role can insert users"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Allow authenticated users to read all users
CREATE POLICY "Authenticated users can read users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 4. Allow admins to do everything
CREATE POLICY "Admins can do everything"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ================================================
-- DONE! Now try creating a new account again.
-- ================================================
