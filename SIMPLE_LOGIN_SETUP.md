# 🚀 Simple Login & Registration Setup

## 1️⃣ Run SQL (2 minutes)

1. Open Supabase SQL Editor:
   **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**

2. Copy **entire content** from file: `supabase/SIMPLE_SETUP.sql`

3. Paste in SQL Editor and click **"Run"**

4. Should see "Success" message

---

## 2️⃣ Create Admin User (30 seconds)

Run this command in terminal:

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"bhupendra","email_confirm":true}'
```

Then set admin role:

```sql
UPDATE users SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@gmail.com';
```

---

## 3️⃣ Test Everything

### Test Login ✅
1. Go to: **http://localhost:5174/login**
2. Enter:
   - Email: `admin@gmail.com`
   - Password: `bhupendra`
3. Click **"Login"**
4. Should redirect to Dashboard!

### Test Registration ✅
1. Go to: **http://localhost:5174/login**
2. Click **"Create New Account →"**
3. Enter:
   - Full Name: Your name
   - Email: Your email
   - Password: Your password (min 6 chars)
4. Click **"Create Account"**
5. Should see success message!
6. Now login with new credentials

---

## ✨ Features Added

### Login Page Updates:
- ✅ Toggle between Login and Registration
- ✅ Registration form with Full Name field
- ✅ Success/Error messages
- ✅ Auto-clear form after registration
- ✅ "Create New Account" button
- ✅ "Back to Login" button

### Database Setup:
- ✅ Simple users table (no complex RLS)
- ✅ Auto-sync with auth.users via trigger
- ✅ Email uniqueness
- ✅ Role-based system
- ✅ Allow all authenticated users (simple policy)

---

## 🔍 Verify Setup

Run this SQL to check:

```sql
-- Check users table
SELECT id, email, full_name, role, is_active
FROM users;

-- Check auth.users
SELECT id, email, email_confirmed_at
FROM auth.users;
```

---

## 🎉 Done!

You now have:
- ✅ Working login system
- ✅ User registration
- ✅ Admin account
- ✅ Simple database setup
- ✅ No complex policies

Start creating drivers and managing your ambulance system! 🚑
