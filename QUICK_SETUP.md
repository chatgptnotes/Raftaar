# ⚡ QUICK SETUP - 5 Minutes

Follow these steps in order:

---

## 📋 STEP 1: Setup Database (2 min)

1. Open: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**

2. Copy-paste ENTIRE content from: `supabase/complete_setup.sql`

3. Click **"Run"** button

4. Wait for success message

✅ This creates: users, drivers, bookings tables with all policies

---

## 👤 STEP 2: Create Admin User (1 min)

### Method A: Dashboard (Easiest)

1. Open: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users**

2. Click **"Add user"** → **"Create new user"**

3. Enter:
   - Email: `admin@gmail.com`
   - Password: `bhupendra`
   - ✅ Check "Auto Confirm User"

4. Click **"Create user"**

### Method B: Using Service Role Key (Faster)

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY_HERE" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "bhupendra",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin",
      "full_name": "Admin User"
    }
  }'
```

Get Service Role Key from: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/settings/api

---

## 🔐 STEP 3: Set Admin Role (30 sec)

1. Open SQL Editor: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**

2. Run this:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## 📦 STEP 4: Create Storage Bucket (1 min)

1. Open: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/storage/buckets**

2. Click **"New bucket"**

3. Enter:
   - Name: `driver-files`
   - ✅ Check "Public bucket"

4. Click **"Create bucket"**

5. Go to SQL Editor and run content from: `supabase/storage_policies.sql`

---

## ✅ STEP 5: Test Login (30 sec)

1. Open: http://localhost:5174/login

2. Login with:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```

3. You should see the Dashboard! 🎉

---

## 🔍 Verify Everything Works

Run this SQL to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'drivers', 'bookings');

-- Check admin user
SELECT * FROM users WHERE email = 'admin@gmail.com';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'driver-files';
```

You should see:
- ✅ 3 tables
- ✅ 1 admin user with role='admin'
- ✅ 1 storage bucket

---

## 🆘 Troubleshooting

### "Invalid login credentials" error

**Problem**: Admin user not created yet
**Solution**: Complete STEP 2 and STEP 3

### "Failed to fetch" error

**Problem**: Supabase URL or keys wrong in `.env`
**Solution**: Check `.env` file has correct values

### Can't upload files

**Problem**: Storage bucket not created
**Solution**: Complete STEP 4

### Data not saving

**Problem**: Tables not created or RLS blocking
**Solution**: Complete STEP 1, verify tables exist

---

## 📞 Need Help?

If still having issues:
1. Check browser console (F12)
2. Check Supabase Dashboard → Logs
3. Verify all steps completed
4. Restart dev server: `npm run dev`

---

## 🎯 After Setup

You can now:
- ✅ Login with admin account
- ✅ Create drivers with file uploads
- ✅ View all drivers in list
- ✅ Delete drivers
- ✅ Access protected routes

Next features to implement:
- Hospital management
- Booking management
- Search and filters
