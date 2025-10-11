# 🔧 Fix Triggers & Create Admin User

## Current Situation
- ✅ Users table already exists
- ✅ RLS Policies already exist
- ❓ Triggers might be missing
- ❌ Admin user NOT created yet

---

## Step 1: Run Trigger SQL (30 seconds)

1. Open SQL Editor: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new

2. Copy-paste this SQL:

```sql
-- Function to sync auth.users with users table
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
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at
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
```

3. Click **"Run"**

4. Should see **"Success"** message

---

## Step 2: Create Admin User (10 seconds)

Run this command in terminal:

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"bhupendra","email_confirm":true}'
```

You should see response with user ID created!

---

## Step 3: Set Admin Role (20 seconds)

Go to SQL Editor and run:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## ✅ Test Login

Go to: http://localhost:5174/login

Login:
- Email: `admin@gmail.com`
- Password: `bhupendra`

Should work! 🎉

---

## 🔍 Verify Everything

Run this to check:

```sql
-- Check admin user in users table
SELECT id, email, role, full_name, is_active
FROM users
WHERE email = 'admin@gmail.com';

-- Check admin user in auth.users
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'admin@gmail.com';
```

Both should show the admin user!
