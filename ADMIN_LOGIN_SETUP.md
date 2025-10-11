# 🔐 Admin Login Setup - 3 Simple Steps

## Step 1: Create Users Table (1 minute)

1. Open SQL Editor: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**

2. Copy-paste this entire content:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'driver', 'hospital', 'user')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-sync with auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.users with users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

3. Click **"Run"** button

4. Wait for success message

---

## Step 2: Create Admin User (30 seconds)

Option A: **Dashboard** (Easiest)

1. Go to: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users**
2. Click **"Add user"** → **"Create new user"**
3. Email: `admin@gmail.com`, Password: `bhupendra`
4. ✅ Check **"Auto Confirm User"**
5. Click **"Create user"**

Option B: **Command Line** (Copy-paste this)

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"bhupendra","email_confirm":true}'
```

---

## Step 3: Set Admin Role (20 seconds)

Go back to SQL Editor and run:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## ✅ DONE! Test Login

Go to: **http://localhost:5174/login**

Login with:
- Email: `admin@gmail.com`
- Password: `bhupendra`

Should work! 🎉

---

## 🔍 Verify Setup

Run this SQL to check:

```sql
-- Check if users table exists
SELECT * FROM users WHERE email = 'admin@gmail.com';

-- Check if auth user exists
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'admin@gmail.com';
```

You should see admin user in both tables with role = 'admin'
