# Supabase Seed Data

## Admin User Setup

Since Supabase uses secure authentication with hashed passwords, we cannot directly insert users into `auth.users` via SQL. Instead, follow these steps:

### Step 1: Create Admin User in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt)
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   ```
   Email: admin@gmail.com
   Password: bhupendra
   ```
5. Check **"Auto Confirm User"** (to skip email verification)
6. Click **"Create user"**

### Step 2: Set Admin Role

After the user is created, the `handle_new_user()` trigger will automatically create a record in the `users` table. However, the role will be `user` by default.

To set the user as admin, run this SQL in the Supabase SQL Editor:

```sql
-- Update user role to admin
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

### Step 3: Verify Admin User

Check if the admin user was created successfully:

```sql
-- Check users table
SELECT * FROM users WHERE email = 'admin@gmail.com';

-- Check auth.users table
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@gmail.com';
```

---

## Alternative: Create Admin User via CLI

If you have linked your project with `supabase link`, you can also create users programmatically:

### Using Supabase Auth API

```bash
# Set your project URL and service role key
export SUPABASE_URL="https://feuqkbefbfqnqkkfzgwt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Create admin user
curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
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

---

## Seed Data for Testing

If you need to create test users for development:

### Test Users

```sql
-- Create test driver user (after creating in auth.users)
UPDATE users
SET role = 'driver', full_name = 'Test Driver'
WHERE email = 'driver@test.com';

-- Create test hospital user
UPDATE users
SET role = 'hospital', full_name = 'Test Hospital'
WHERE email = 'hospital@test.com';

-- Create regular test user
UPDATE users
SET role = 'user', full_name = 'Test User'
WHERE email = 'user@test.com';
```

---

## Important Notes

1. **Never commit passwords**: The passwords mentioned here are for development only
2. **Production**: Use strong passwords and enable email verification
3. **Service Role Key**: Keep service role key secret, never expose in frontend
4. **Auto-sync**: The `handle_new_user()` trigger automatically creates a `users` table entry when a user signs up via Supabase Auth

---

## Roles

The `users` table supports these roles:
- `admin`: Full access to all resources
- `driver`: Driver management access
- `hospital`: Hospital management access
- `user`: Regular user access

---

## Users Table Schema

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| auth_user_id | UUID | References auth.users(id) |
| email | TEXT | User email (unique) |
| full_name | TEXT | Full name of user |
| role | TEXT | User role (admin/driver/hospital/user) |
| phone | TEXT | Phone number |
| avatar_url | TEXT | Profile picture URL |
| is_active | BOOLEAN | Account active status |
| email_verified | BOOLEAN | Email verification status |
| last_login_at | TIMESTAMP | Last login timestamp |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
