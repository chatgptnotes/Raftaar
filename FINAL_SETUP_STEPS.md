# ⚡ FINAL SETUP - Just 3 Steps!

## 🔴 STEP 1: Run SQL (2 minutes)

1. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new

2. **Open the file** `supabase/complete_setup.sql` in VS Code

3. **Copy ENTIRE content** (Ctrl+A → Ctrl+C)

4. **Paste in SQL Editor**

5. **Click "Run"** button (or Ctrl+Enter)

6. **Wait for "Success"** message

✅ This creates: users, drivers, bookings tables with all policies!

---

## 🔴 STEP 2: Run This Command (Instant!)

Copy-paste this command in your terminal:

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"bhupendra","email_confirm":true,"user_metadata":{"role":"admin","full_name":"Admin User"}}'
```

**Or use Node.js script:**
```bash
node create-admin.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI"
```

✅ This creates: admin@gmail.com user with password: bhupendra

---

## 🔴 STEP 3: Set Admin Role (30 seconds)

Go to SQL Editor again and run:

```sql
UPDATE users SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@gmail.com';
```

✅ This sets admin role for the user!

---

## 📦 BONUS: Storage Bucket (Optional - 1 minute)

For file uploads to work:

1. Go to: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/storage/buckets
2. Click "New bucket"
3. Name: `driver-files`
4. Check "Public bucket"
5. Click "Create bucket"
6. Run SQL from `supabase/storage_policies.sql`

---

## 🎉 TEST LOGIN

Open: http://localhost:5174/login

Login with:
- Email: `admin@gmail.com`
- Password: `bhupendra`

Should work perfectly! ✅

---

## ❓ If Error "Database error creating new user"

This means STEP 1 (SQL) was not run yet. Go back and complete STEP 1 first!
