-- ================================================
-- MINIMAL USERS TABLE - Name, Email Only
-- ================================================
-- Password is stored in auth.users (Supabase handles it)
-- This table just stores name and email
-- ================================================

-- Drop table if exists (fresh start)
DROP TABLE IF EXISTS users CASCADE;

-- Create minimal users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS with simple policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
CREATE POLICY "Allow authenticated users full access"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auto-sync function: when user signs up, create entry in users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create users entry when someone registers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ================================================
-- DONE! Now you can:
-- 1. Register new users from login page
-- 2. Login with email/password
-- 3. Password is handled by Supabase Auth automatically
-- ================================================

-- To create admin user, run this after creating in Supabase Dashboard:
-- No additional SQL needed - just create user in Authentication > Users
-- Email: admin@gmail.com
-- Password: bhupendra
-- The trigger will automatically create entry in users table!
