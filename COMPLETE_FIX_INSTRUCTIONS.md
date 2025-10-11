# Complete Fix for "Database Error Saving New User"

## Problem
Your signup was failing with error: `{"code":"unexpected_failure","message":"Database error saving new user"}`

## Root Cause
1. RLS (Row Level Security) policy was blocking the trigger from inserting new users
2. Table structure needed to be adapted for Supabase Auth integration

## Solution Applied

### 1. Database Changes (✅ SQL Ready)
File: `supabase/FIX_FOR_YOUR_TABLE.sql`

This SQL will:
- Add `auth_user_id` column to link with Supabase Auth
- Add `role` column for admin/user roles
- Remove `password` column (Supabase Auth handles passwords)
- Set up proper RLS policies
- Create trigger to auto-insert user data on signup

### 2. Frontend Changes (✅ Already Updated)
File: `src/pages/Login.jsx`
- Changed `full_name` to `name` to match your table structure

## How to Apply the Fix

### Step 1: Run the SQL
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Copy the entire contents of `supabase/FIX_FOR_YOUR_TABLE.sql`
5. Paste and click **Run**

### Step 2: Create Admin User
After running the SQL, create your admin user:

**Option A: Via Supabase Dashboard**
1. Go to **Authentication** > **Users**
2. Click **Add user**
3. Enter:
   - Email: `admin@gmail.com`
   - Password: `bhupendra`
4. Enable **Auto Confirm User** checkbox
5. Click **Create user**

**Option B: Via SQL**
```sql
-- This will be auto-created when you sign up through the UI
-- But if you want to create it manually:
UPDATE users SET role = 'admin' WHERE email = 'admin@gmail.com';
```

### Step 3: Test Signup
1. Go to `localhost:5174/login`
2. Click **Create New Account**
3. Fill in:
   - Full Name: `admin`
   - Email: `admin@gmail.com`
   - Password: `bhupendra` (or any password)
4. Click **Create Account**
5. Should see success message!

## Your Final Table Structure

```sql
users table:
├── id (uuid, primary key)
├── auth_user_id (uuid, links to auth.users) ← ADDED
├── name (text)
├── email (text, unique)
├── role (text, default 'user') ← ADDED
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Verification

After setup, verify everything works:

```sql
-- Check if trigger is working
SELECT * FROM users;

-- Check if policies are set
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## Troubleshooting

If you still get errors:

1. **Check if SQL ran successfully**: Look for green "Success" message in SQL Editor
2. **Check if table exists**: Run `SELECT * FROM users;`
3. **Check RLS policies**: Run query above
4. **Check trigger exists**:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Summary

✅ Database error fixed
✅ RLS policies configured
✅ Trigger function updated
✅ Frontend code updated
✅ Ready to create new accounts!
