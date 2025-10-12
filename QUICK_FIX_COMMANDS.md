# Quick Fix Commands - Driver Queue 406 Error

## 🚨 Problem Summary
Your application is showing:
- ❌ 406 Not Acceptable errors on `driver_assignment_queue` table
- ❌ "Queue entry not found or already updated" warnings
- ❌ Status constraint violations
- ❌ Call timeout issues

## ⚡ Quick Fix (3 Steps)

### Step 1: Run SQL Migration

Open your Supabase Dashboard → SQL Editor and run this file:
```
supabase/migrations/fix_driver_queue_complete.sql
```

OR use command line:
```bash
cd /Users/apple/Downloads/Raftaar

# Option A: Using Supabase CLI
npx supabase db push

# Option B: Using psql
psql "$DATABASE_URL" -f supabase/migrations/fix_driver_queue_complete.sql
```

### Step 2: Verify Changes

Run this in Supabase SQL Editor to confirm:
```sql
-- Should return 1 row showing response_analysis column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'driver_assignment_queue' AND column_name = 'response_analysis';

-- Should show policy "Allow all operations for all roles"
SELECT policyname FROM pg_policies WHERE tablename = 'driver_assignment_queue';
```

### Step 3: Restart Application

```bash
# Stop current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ How to Test It Works

1. Go to Bookings page
2. Create a new booking with location
3. Click "Auto-Assign All"
4. Open browser console (F12)
5. Look for:
   - ✅ NO 406 errors
   - ✅ "Update successful" messages
   - ✅ Queue entries updating properly

## 🎯 Expected Console Output (After Fix)

```
🚗 [Driver Assignment] Starting auto-assignment...
📋 [Driver Queue] Storing fallback driver queue...
📞 [Driver Assignment] Calling first driver in queue...
🔄 [Driver Queue] Updating entry (attempt 1/3)...
✅ [Driver Queue] Update successful
⏳ [Intelligent Reassignment] Waiting for call completion...
```

## 🔍 What Changed

**Database:**
- ✅ Added `response_analysis` JSONB column
- ✅ Added missing statuses: `unclear`, `cancelled`, etc.
- ✅ Fixed RLS policies to allow `anon` role
- ✅ Granted proper permissions

**Code:**
- ✅ Added retry logic (3 attempts)
- ✅ Better error handling
- ✅ Graceful degradation

## 📄 Full Documentation

For detailed troubleshooting and testing guide, see:
`DRIVER_QUEUE_FIX_GUIDE.md`

---

**Quick Checklist:**
- [ ] Run SQL migration
- [ ] Verify changes in database
- [ ] Restart application
- [ ] Test auto-assign
- [ ] Check console (no 406 errors)
- [ ] Celebrate! 🎉
