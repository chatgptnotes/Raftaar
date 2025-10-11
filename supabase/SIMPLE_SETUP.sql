-- ================================================
-- SIMPLE USERS TABLE SETUP - NO COMPLEX POLICIES
-- ================================================
-- Just run this SQL and login will work!
-- ================================================

-- Drop existing table if you want fresh start (CAUTION: deletes all data)
-- DROP TABLE IF EXISTS users CASCADE;

-- Create simple users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Enable RLS but with simple policy - allow all authenticated users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;

-- Simple policy: Allow authenticated users to do everything
CREATE POLICY "Allow all authenticated users"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to sync auth.users with users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ================================================
-- SUCCESS!
-- ================================================
-- Now create admin user using one of these methods:
--
-- Method 1: Supabase Dashboard
-- - Go to Authentication > Users
-- - Add user: admin@gmail.com / bhupendra
-- - Auto confirm user
--
-- Method 2: Use curl command (see below)
--
-- After user is created, run this to set admin role:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@gmail.com';
-- ================================================
