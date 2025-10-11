-- ================================================
-- COMPLETE FIX FOR YOUR TABLE STRUCTURE
-- ================================================
-- This will modify your existing table to work with Supabase Auth
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Step 1: Add auth_user_id column to link with Supabase Auth
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add role column for admin/user distinction
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Step 3: Remove password column (Supabase Auth handles passwords)
-- Note: If you want to keep it for some reason, comment this line
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- Step 4: Create index on auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Step 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop all existing policies
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can do everything" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;

-- Step 7: Create proper RLS policies
-- Allow service_role (triggers) to insert new users
CREATE POLICY "Service role can insert users"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to read all users
CREATE POLICY "Authenticated users can read users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow admins to do everything
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

-- Step 8: Create/Replace trigger function for your table structure
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ================================================
-- VERIFICATION QUERIES (Optional - to check setup)
-- ================================================
-- Check table structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
--
-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'users';
--
-- ================================================
-- NOW CREATE ADMIN USER
-- ================================================
-- After running this SQL:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user"
-- 3. Email: admin@gmail.com, Password: bhupendra
-- 4. Enable "Auto Confirm User"
-- 5. Click "Create user"
--
-- Then run this to make them admin:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@gmail.com';
-- ================================================
