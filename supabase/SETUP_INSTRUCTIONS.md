# Supabase Setup Instructions

Complete step-by-step guide to setup your Raftaar database in Supabase.

## 📋 Prerequisites

- Supabase account
- Project: `feuqkbefbfqnqkkfzgwt`
- Project URL: `https://feuqkbefbfqnqkkfzgwt.supabase.co`

---

## 🚀 Setup Steps

### Step 1: Run Database Setup SQL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Copy the entire content from `supabase/complete_setup.sql`
5. Paste it in the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)

This will create:
- ✅ `users` table with RLS policies
- ✅ `drivers` table with RLS policies
- ✅ `bookings` table with RLS policies
- ✅ Triggers for auto-sync and timestamps
- ✅ Indexes for better performance

---

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Enter details:
   - **Name**: `driver-files`
   - **Public**: ✅ Yes (check this box)
4. Click **"Create bucket"**

---

### Step 3: Add Storage Policies

1. Go to **SQL Editor** again
2. Click **"New query"**
3. Copy the entire content from `supabase/storage_policies.sql`
4. Paste it in the SQL Editor
5. Click **"Run"**

This will allow:
- ✅ Authenticated users to upload files
- ✅ Public access to view files
- ✅ Authenticated users to delete files

---

### Step 4: Create Admin User

1. In Supabase Dashboard, go to **Authentication** > **Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in details:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```
4. ✅ Check **"Auto Confirm User"**
5. Click **"Create user"**

---

### Step 5: Set Admin Role

1. Go to **SQL Editor**
2. Run this query:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

3. Click **"Run"**

---

### Step 6: Verify Setup

Run this query to verify everything is working:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'drivers', 'bookings');

-- Check admin user
SELECT * FROM users WHERE email = 'admin@gmail.com';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'driver-files';
```

You should see:
- ✅ 3 tables: users, drivers, bookings
- ✅ 1 user with role 'admin'
- ✅ 1 bucket: driver-files

---

## ✅ Setup Complete!

You can now:
1. Start your development server: `npm run dev`
2. Go to: http://localhost:5174/login
3. Login with: `admin@gmail.com` / `bhupendra`
4. Access dashboard and start managing drivers!

---

## 🔧 Database Schema Summary

### users table
- Stores application user data
- Auto-syncs with `auth.users`
- Roles: admin, driver, hospital, user
- RLS: Users can view/edit own profile, admins can manage all

### drivers table
- Stores driver information and documents
- Links to `auth.users` via `user_id`
- Includes vehicle details and document URLs
- RLS: All authenticated users can read/insert, owners can update

### bookings table
- Stores ambulance booking records
- Links to `drivers` table
- Tracks status, timing, distance, amount
- RLS: All authenticated users can perform CRUD operations

---

## 📞 Support

If you encounter any issues:
1. Check Supabase Dashboard logs
2. Verify all tables were created successfully
3. Ensure RLS policies are active
4. Check browser console for errors

---

## 🔒 Security Notes

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Auto-sync trigger for auth users
- ✅ Admin role required for user management
- ✅ File uploads restricted to authenticated users
- ⚠️ Never commit `.env` file to git
- ⚠️ Keep service role key secret
