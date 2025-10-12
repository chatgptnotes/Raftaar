# Call Tracking Feature Setup Guide

## Overview
Yeh feature booking table mein call status track karta hai - ki kis booking ke liye victim (patient) ko call kiya gaya hai aur kis booking ke liye driver ko call kiya gaya hai.

## Setup Steps

### Step 1: Run SQL Migration
Supabase dashboard mein jaake SQL Editor open karo aur ye file run karo:

```bash
supabase/migrations/add_call_tracking_columns.sql
```

Ya fir directly SQL Editor mein paste karo:

```sql
-- Add columns to track call status
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS victim_call_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS victim_call_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS victim_call_status TEXT,
ADD COLUMN IF NOT EXISTS driver_call_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_call_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_call_status TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_victim_call_made ON bookings(victim_call_made);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_call_made ON bookings(driver_call_made);
```

### Step 2: Verify Database Update
SQL Editor mein ye query run karke verify karo:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name LIKE '%call%';
```

## Features Implemented

### 1. Database Schema
- ✅ `victim_call_made`: Boolean flag indicating if patient was called
- ✅ `victim_call_time`: Timestamp when patient call was initiated
- ✅ `victim_call_status`: Status of patient call (success/failed)
- ✅ `driver_call_made`: Boolean flag indicating if driver was called
- ✅ `driver_call_time`: Timestamp when driver call was initiated
- ✅ `driver_call_status`: Status of driver call (success/failed)

### 2. Backend Service (bolnaService.js)
- ✅ Automatically updates `victim_call_made` and `victim_call_status` when calling patient
- ✅ Automatically updates `driver_call_made` and `driver_call_status` when calling driver
- ✅ Stores timestamp of when call was initiated
- ✅ Handles both success and failure cases

### 3. Frontend Display (Bookings.jsx)
- ✅ Added "Call Status" column in bookings table
- ✅ Shows color-coded badges:
  - 🟢 Green: Patient called successfully
  - 🔵 Blue: Driver called successfully
  - 🔴 Red: Call failed
  - ⚪ Gray: No call made yet
- ✅ Displays both patient and driver call status for each booking

## How It Works

### Patient Call Flow
1. New booking is created
2. `makeBolnaCall()` function is triggered automatically
3. After successful/failed call, booking is updated:
   - `victim_call_made = true`
   - `victim_call_time = current timestamp`
   - `victim_call_status = 'success' or 'failed'`

### Driver Call Flow
1. Driver is assigned to booking
2. `makeDriverCall()` function is triggered
3. After successful/failed call, booking is updated:
   - `driver_call_made = true`
   - `driver_call_time = current timestamp`
   - `driver_call_status = 'success' or 'failed'`

## Visual Indicators

### In Bookings Table
- **Patient Called (Success)**: Green badge with ✓ Patient Called
- **Patient Call Failed**: Red badge with ✗ Call Failed
- **Driver Called (Success)**: Blue badge with ✓ Driver Called
- **Driver Call Failed**: Red badge with ✗ Driver Call Failed
- **No Call Made**: Gray badge with No Call

## Testing

1. Create a new booking
2. Check if "Call Status" column shows "✓ Patient Called" (green)
3. Assign a driver to the booking
4. Check if "Call Status" also shows "✓ Driver Called" (blue)

## Files Modified

1. `/supabase/migrations/add_call_tracking_columns.sql` - Database migration
2. `/src/services/bolnaService.js` - Backend service to track calls
3. `/src/pages/Bookings.jsx` - Frontend display of call status

## Troubleshooting

### Call Status Not Showing?
- Run the SQL migration in Supabase dashboard
- Refresh the page
- Check browser console for errors

### Calls Not Being Marked?
- Check if `booking.id` is available in `makeBolnaCall()`
- Check if `booking.booking_id` is available in `makeDriverCall()`
- Check Supabase logs for any errors

## Next Steps (Optional)

- Add call duration tracking
- Add retry mechanism for failed calls
- Add call recordings reference
- Add notification when call status changes
