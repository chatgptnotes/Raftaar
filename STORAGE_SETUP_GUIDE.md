# Fix: "Bucket not found" Error

## Problem
Getting error: `{statusCode: "404", error: "Bucket not found", message: "Bucket not found"}`

This means the storage bucket `driver-files` doesn't exist in Supabase Storage.

## Solution

### Method 1: Via SQL (Recommended - Fastest)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `feuqkbefbfqnqkkfzgwt`
3. Go to **SQL Editor** (left sidebar)
4. Copy and paste the contents of `supabase/CREATE_STORAGE_BUCKET.sql`
5. Click **Run**
6. Wait for green "Success" message

This will:
- ✅ Create `driver-files` bucket
- ✅ Set up all storage policies
- ✅ Allow public read access
- ✅ Allow authenticated users to upload

### Method 2: Via Dashboard (Alternative)

#### Step 1: Create Bucket
1. Open Supabase Dashboard
2. Go to **Storage** (left sidebar)
3. Click **Create a new bucket**
4. Enter bucket name: `driver-files`
5. Enable **Public bucket** toggle
6. Click **Create bucket**

#### Step 2: Set Up Policies
1. Click on `driver-files` bucket
2. Go to **Policies** tab
3. Click **New policy**
4. Create these 4 policies:

**Policy 1: Public Read**
- Name: `Allow public read access`
- Operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'driver-files'`

**Policy 2: Authenticated Upload**
- Name: `Allow authenticated users to upload`
- Operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `bucket_id = 'driver-files'`

**Policy 3: Update Own Files**
- Name: `Allow users to update own files`
- Operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'driver-files' AND auth.uid()::text = owner::text`

**Policy 4: Delete Own Files**
- Name: `Allow users to delete own files`
- Operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'driver-files' AND auth.uid()::text = owner::text`

---

## Additional Fix: Update Drivers Table

The drivers table is missing `latitude` and `longitude` columns. Run this SQL too:

```sql
-- File: supabase/UPDATE_DRIVERS_TABLE.sql
-- Just run this in SQL Editor
```

This adds location columns for Google Maps coordinates.

---

## Test After Setup

1. Go to Create Driver page: `localhost:5173/dashboard/driver/create`
2. Fill in the form
3. Upload all images
4. Submit
5. Should work without "Bucket not found" error!

---

## Verification

To check if bucket was created:
1. Go to Supabase Dashboard > **Storage**
2. You should see `driver-files` bucket
3. Click on it - should be empty initially
4. After successful upload, files will appear here

---

## Folder Structure in Bucket

Files will be organized as:
```
driver-files/
├── profiles/       (Profile images)
├── vehicles/       (Vehicle images)
└── proofs/
    ├── vehicle/    (Vehicle proof documents)
    └── driver/     (Driver proof documents)
```
