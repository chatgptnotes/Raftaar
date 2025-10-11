# Create Admin User - Simple Method

## Method 1: Using Supabase Dashboard (Recommended) ✅

1. Go to: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users
2. Click **"Add user"** button (top right)
3. Click **"Create new user"**
4. Fill in:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```
5. ✅ Check **"Auto Confirm User"**
6. Click **"Create user"**
7. User will be created in `auth.users` automatically
8. The trigger will auto-create entry in `users` table

### Set Admin Role

After user is created, go to **SQL Editor** and run:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## Method 2: Using cURL with Service Role Key

If you have service role key, run this command:

```bash
curl -X POST "https://feuqkbefbfqnqkkfzgwt.supabase.co/auth/v1/admin/users" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
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

Then run this SQL to set admin role:

```sql
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## Verify Admin User

Run this SQL to check if admin user was created:

```sql
-- Check in users table
SELECT id, email, full_name, role, is_active
FROM users
WHERE email = 'admin@gmail.com';

-- Check in auth.users table
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@gmail.com';
```

You should see:
- ✅ User in both tables
- ✅ Role = 'admin'
- ✅ Email confirmed

---

## Login Credentials

After setup is complete, you can login with:

```
Email: admin@gmail.com
Password: bhupendra
```

at: http://localhost:5174/login
