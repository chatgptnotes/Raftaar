# 🚀 Create Admin User RIGHT NOW

## Step 1: Open Supabase Dashboard

Click this link:
**https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users**

## Step 2: Create User

1. Click **"Add user"** button (top right green button)
2. Click **"Create new user"**
3. Fill in exactly:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```
4. ✅ Check **"Auto Confirm User"** checkbox
5. Click **"Create user"**

## Step 3: Set Admin Role

1. Go to SQL Editor: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new**
2. Paste this SQL:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

3. Click **"Run"** or press **Ctrl+Enter**

## Step 4: Login

1. Go to: http://localhost:5174/login
2. Login with:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```

## ✅ Done!

You should now be able to login successfully!

---

## 🔥 FASTER METHOD (If you have Service Role Key)

If you want to do it via command line, give me your **Service Role Key** and I'll create the user instantly using curl command.

Service Role Key looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ...
```

Find it at: **https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/settings/api**

Under "Project API keys" → "service_role" → "Reveal" button
