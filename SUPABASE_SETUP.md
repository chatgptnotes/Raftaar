# Supabase Integration Setup Guide

## ✅ Completed Integration

The following Supabase integration has been successfully implemented:

### 1. **Package Installation**
- ✅ Installed `@supabase/supabase-js` v2.75.0

### 2. **Configuration Files**
- ✅ Added Supabase credentials to `.env` file
- ✅ Created Supabase client (`src/lib/supabaseClient.js`)
- ✅ Created AuthContext (`src/contexts/AuthContext.jsx`)

### 3. **Authentication System**
- ✅ Updated Login page with Supabase Auth
- ✅ Updated ProtectedRoute with session management
- ✅ Added loading states and error handling
- ✅ Integrated logout functionality in all protected pages
- ✅ Created users table migration with auto-sync to auth.users
- ✅ Implemented role-based access control (admin/driver/hospital/user)

### 4. **Driver Management**
- ✅ Updated Driver list page to fetch from Supabase
- ✅ Added real-time data fetching
- ✅ Implemented delete functionality
- ✅ Added loading/error states
- ✅ Updated CreateDriver form with file uploads and data insertion

---

## 🔧 Required Supabase Dashboard Setup

To complete the integration, you need to set up the following in your Supabase Dashboard:

### Step 1: Run Migrations

The project now uses Supabase migrations for database schema management.

**Option A: Using Supabase CLI (Recommended)**

1. Login to Supabase CLI:
```bash
supabase login
```

2. Link to your project:
```bash
supabase link --project-ref feuqkbefbfqnqkkfzgwt
```

3. Push migrations to remote:
```bash
supabase db push
```

**Option B: Manual SQL Execution**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create users table (from migration: 20251011084829_create_users_table.sql)
-- This is automatically handled by the migration file in supabase/migrations/

-- Create drivers table
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  pin_code TEXT,
  vehicle_model TEXT,
  vehicle_number TEXT,
  service_type TEXT,
  profile_image_url TEXT,
  vehicle_image_url TEXT,
  vehicle_proof_url TEXT,
  driver_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table (for future use)
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id),
  booking_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  timing TIMESTAMP WITH TIME ZONE,
  distance TEXT,
  amount TEXT,
  booking_source TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drivers table
CREATE POLICY "Allow authenticated users to read drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their own driver profile"
  ON drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to delete drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for bookings table
CREATE POLICY "Allow authenticated users to read bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### Step 2: Create Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **"New bucket"**
3. Create a bucket named: `driver-files`
4. Make it **Public** (so uploaded files are accessible)
5. Set the following **bucket policies**:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'driver-files');

-- Allow public access to view files
CREATE POLICY "Allow public to view files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'driver-files');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'driver-files');
```

### Step 3: Create Admin User

Create an admin user in Supabase Auth for testing:

1. Go to **Authentication** > **Users**
2. Click **"Add user"**
3. Enter:
   - Email: `admin@gmail.com`
   - Password: `bhupendra` (or your preferred password)
4. Check **"Auto Confirm User"** (to skip email verification)
5. Click **"Create user"**

**Note**: The `handle_new_user()` trigger will automatically create a record in the `users` table. However, the role will be `user` by default.

6. To set the user as admin, run this SQL in the Supabase SQL Editor:

```sql
-- Update user role to admin
UPDATE users
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@gmail.com';
```

---

## 📁 Project Structure

```
src/
├── lib/
│   └── supabaseClient.js          # Supabase client configuration
├── contexts/
│   └── AuthContext.jsx             # Authentication context provider
├── components/
│   └── ProtectedRoute.jsx          # Route protection with session check
├── pages/
│   ├── Login.jsx                   # Login with Supabase Auth
│   ├── Dashboard.jsx               # Dashboard with logout
│   ├── Driver.jsx                  # Driver list with Supabase data
│   └── CreateDriver.jsx            # Create driver with file uploads
```

---

## 🚀 How to Use

### 1. Start Development Server
```bash
npm run dev
```

### 2. Login
- Navigate to http://localhost:5174/login
- Use credentials: `admin@gmail.com` / `bhupendra`

### 3. Create Driver
- Go to Dashboard → Driver → Create Driver
- Fill in all required fields
- Upload profile image, vehicle image, vehicle proof, and driver proof
- Click Submit

### 4. View Drivers
- All drivers will be fetched from Supabase database
- Real-time updates
- View, Edit, Delete functionality

---

## 🔐 Security Notes

1. **Service Role Key**: The service role key should NEVER be exposed in frontend code. It's only used for server-side operations or migrations.

2. **Row Level Security (RLS)**: Always enable RLS on your tables to protect data.

3. **File Upload Security**: The `driver-files` bucket is set to public for easy access. For production, consider implementing more restrictive policies.

4. **Environment Variables**: Never commit `.env` file to git. Add it to `.gitignore`.

---

## 📝 Database Schema

### users table

The `users` table stores application user data and is automatically synchronized with Supabase `auth.users` via triggers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| auth_user_id | UUID | Reference to auth.users (cascade delete) |
| email | TEXT | User email (unique) |
| full_name | TEXT | Full name of user |
| role | TEXT | User role (admin/driver/hospital/user) |
| phone | TEXT | Phone number |
| avatar_url | TEXT | Profile picture URL |
| is_active | BOOLEAN | Account active status (default: true) |
| email_verified | BOOLEAN | Email verification status |
| last_login_at | TIMESTAMP | Last login timestamp |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp (auto-updated) |

**Key Features:**
- Automatic sync with `auth.users` via `handle_new_user()` trigger
- RLS policies for user access control (users can view/edit own profile, admins can manage all)
- Auto-updating `updated_at` timestamp on record changes
- Role-based access control with CHECK constraint

### drivers table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| first_name | TEXT | Driver's first name |
| last_name | TEXT | Driver's last name |
| email | TEXT | Driver's email (unique) |
| phone | TEXT | Driver's phone number |
| address | TEXT | Driver's address |
| city | TEXT | Driver's city |
| pin_code | TEXT | Driver's PIN code |
| vehicle_model | TEXT | Vehicle model |
| vehicle_number | TEXT | Vehicle registration number |
| service_type | TEXT | Type of ambulance service |
| profile_image_url | TEXT | URL to profile image |
| vehicle_image_url | TEXT | URL to vehicle image |
| vehicle_proof_url | TEXT | URL to vehicle proof document |
| driver_proof_url | TEXT | URL to driver proof document |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

---

## 🎯 Next Steps

1. ✅ Complete Supabase Dashboard setup (tables, storage, policies)
2. ✅ Create admin user
3. ✅ Test login functionality
4. ✅ Test driver creation with file uploads
5. ⏳ Implement Hospital management (similar to Driver)
6. ⏳ Implement Booking management
7. ⏳ Add real-time subscriptions for live updates
8. ⏳ Implement search and filtering
9. ⏳ Add pagination for large datasets

---

## 🐛 Troubleshooting

### Login not working
- Check if admin user exists in Supabase Auth
- Verify Supabase URL and Anon Key in `.env`
- Check browser console for errors

### File upload failing
- Ensure `driver-files` bucket exists
- Check bucket is set to Public
- Verify storage policies are created

### Data not loading
- Check if tables exist in Supabase
- Verify RLS policies allow SELECT
- Check network tab for API errors

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [React + Supabase Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
