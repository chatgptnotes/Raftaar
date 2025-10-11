-- ================================================
-- FIX: Allow New User Registration
-- ================================================
-- This fixes the "Database error saving new user" issue
-- by properly configuring RLS policies for signup
-- ================================================

-- First, ensure the trigger function bypasses RLS with proper grants
-- Grant necessary permissions to the trigger function
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.users TO anon, authenticated;

-- Recreate the handle_new_user function with proper security
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Create policy that allows inserts during signup
-- This allows the trigger (running as service role) to insert
CREATE POLICY "Allow signup inserts"
  ON users FOR INSERT
  WITH CHECK (true);

-- Keep the admin insert policy for manual admin operations
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ================================================
-- Run this SQL in Supabase SQL Editor
-- This will fix the signup error
-- ================================================
