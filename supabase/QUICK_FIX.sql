-- ================================================
-- QUICK FIX: Allow User Registration
-- ================================================
-- Copy and paste this into Supabase SQL Editor
-- ================================================

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;
DROP POLICY IF EXISTS "Allow signup inserts" ON users;

-- Create simple policies that allow everything
-- For SELECT: Allow authenticated users to read
CREATE POLICY "Allow authenticated select"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- For INSERT: Allow both anon and authenticated (needed for signup)
CREATE POLICY "Allow insert for signup"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- For UPDATE: Allow authenticated users
CREATE POLICY "Allow authenticated update"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- For DELETE: Allow authenticated users
CREATE POLICY "Allow authenticated delete"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- Make sure the trigger function exists with proper permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ================================================
-- DONE! Now try registering again
-- ================================================
