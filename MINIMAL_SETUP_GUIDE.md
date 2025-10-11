# ⚡ Minimal Setup - Name, Email Only

## Table Structure

```
users table:
- id (UUID)
- auth_user_id (UUID) - links to auth.users
- name (TEXT)
- email (TEXT)
- created_at (TIMESTAMP)
```

**Password is stored in `auth.users` by Supabase (encrypted)**

---

## 🚀 Quick Setup (2 Steps)

### Step 1: Run SQL (1 minute)

1. Open: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**

2. Copy-paste this SQL:

```sql
-- Create minimal users table
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow all authenticated users
CREATE POLICY "Allow authenticated users full access"
  ON users FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Auto-sync function
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

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

3. Click **"Run"**

---

### Step 2: Create Admin User (30 sec)

**Option A: Dashboard (Easy)**
1. Go to: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users
2. Click "Add user" → "Create new user"
3. Email: `admin@gmail.com`
4. Password: `bhupendra`
5. Check "Auto Confirm User"
6. Click "Create user"

✅ Done! Trigger will automatically add entry to users table.

**Option B: Command Line**
```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"bhupendra","email_confirm":true,"user_metadata":{"full_name":"Admin User"}}'
```

---

## ✅ Test Login

1. Go to: **http://localhost:5174/login**
2. Email: `admin@gmail.com`
3. Password: `bhupendra`
4. Click "Login"
5. Should work! 🎉

---

## ✅ Test Registration

1. Click **"Create New Account →"**
2. Full Name: `Test User`
3. Email: `test@example.com`
4. Password: `test123`
5. Click "Create Account"
6. Success! Now login with new credentials

---

## 🔍 Verify

Check if data is stored:

```sql
-- Check users table
SELECT * FROM users;

-- Check auth.users (password is here, hashed)
SELECT id, email, email_confirmed_at FROM auth.users;
```

---

## 📝 How It Works

1. User registers/logs in → Password stored in `auth.users` (Supabase Auth)
2. Trigger automatically creates entry in `users` table with name and email
3. `auth.users` = Authentication (password, security)
4. `users` = Your app data (name, email, other info)

---

## ✨ Done!

You now have:
- ✅ Minimal users table (name, email)
- ✅ Password handled by Supabase Auth
- ✅ Auto-sync trigger
- ✅ Login & registration working
- ✅ Clean, simple setup

**Total time: 2 minutes!** 🚀
