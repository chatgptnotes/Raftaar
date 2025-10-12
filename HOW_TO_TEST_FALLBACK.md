# How to Test Driver Fallback System

## System Overview

The new system automatically calls the next driver if the current driver:
- Says "No"
- Doesn't answer within 60 seconds
- Call fails

## How It Works (Step-by-Step)

### 1. When You Click "Auto-Assign All"

```
1. System finds 3 nearest drivers
2. Stores them in queue table (Position 1, 2, 3)
3. Calls Driver #1 immediately
4. Starts 60-second timer
```

Console will show:
```
🚗🚗🚗 [Driver Search] Finding nearest 3 drivers...
✅ [Driver Search] Found 3 available driver(s)
   1. Rajesh Kumar - 2.30 km
   2. Amit Singh - 3.50 km
   3. Vikram Sharma - 5.10 km

📋 [Driver Queue] Storing fallback driver queue...
✅ [Driver Queue] Stored 3 drivers in queue

📞 [Driver Queue] Calling first driver in queue...
📞 [Bolna Driver] Calling driver: Rajesh Kumar
✅ [Bolna Driver] Call initiated successfully

⏰ [Call Monitor] Started monitoring call
⏰ [Call Monitor] Will auto-fallback after 60 seconds if no response
```

### 2. What Happens During Call

**Option A: You manually mark the response (RECOMMENDED FOR TESTING)**

In the bookings table, you'll see a yellow row under the booking with:
- Current driver being called
- Two buttons: "✓ Accept" and "✗ Reject"

**Click "✗ Reject"** to test fallback immediately (without waiting 60 seconds)

**Option B: Wait 60 seconds (Automatic)**

If no response after 60 seconds, system automatically:
1. Marks Driver #1 as "no_answer"
2. Calls Driver #2
3. Starts new 60-second timer

### 3. Testing Workflow

**Test Case 1: First Driver Rejects**
```
1. Create test booking (or use existing pending booking)
2. Click "Auto-Assign All"
3. Wait for Driver #1 call to initiate
4. In yellow status row, click "✗ Reject"
5. ✅ System should immediately call Driver #2
6. Check console logs for confirmation
```

**Expected Console Output:**
```
❌ [Call Monitor] Driver rejected, calling next driver immediately
⚠️ [Call Monitor] Driver REJECTED
📞 [Call Monitor] Calling next driver: Amit Singh
✅ [Call Monitor] Next driver called and monitor started
```

**Test Case 2: Second Driver Accepts**
```
1. Driver #2 gets called
2. Click "✓ Accept"
3. ✅ Booking should be assigned to Driver #2
4. Other pending drivers cancelled
```

**Expected Console Output:**
```
✅ [Call Monitor] Manually marking driver as accepted
✅ [Call Monitor] Driver accepted and booking assigned
```

**Test Case 3: All Drivers Reject (Fail Safe)**
```
1. Reject Driver #1 → Driver #2 called
2. Reject Driver #2 → Driver #3 called
3. Reject Driver #3 → No more drivers
4. ✅ Booking marked as "no_drivers_available"
```

## How to Verify It's Working

### Check 1: Queue Table
Open Supabase → Table Editor → `driver_assignment_queue`

You should see 3 entries per booking:
```
| Position | Driver    | Status   | Call ID        | Called At |
|----------|-----------|----------|----------------|-----------|
| 1        | Rajesh K  | rejected | exec_abc123    | 14:30:00  |
| 2        | Amit S    | calling  | exec_def456    | 14:31:15  |
| 3        | Vikram S  | pending  | NULL           | NULL      |
```

### Check 2: Booking Status
The booking should show:
- Status: "assigned" (when driver accepts)
- Driver: The assigned driver's name
- Distance: Distance from driver to patient

### Check 3: Console Logs
Open browser DevTools → Console

Look for these logs:
- ✅ Green checkmarks = Success
- ❌ Red X = Errors
- 📞 Phone icon = Calls being made
- ⏰ Clock icon = Timer started/stopped

## Manual Testing Steps

### Setup (One Time)
1. Run database migration:
   ```sql
   -- In Supabase SQL Editor, run:
   -- File: supabase/migrations/create_driver_assignment_queue.sql
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

### Test Run
1. **Open Bookings Dashboard**
   - Navigate to `/dashboard/bookings`

2. **Create Test Booking** (or use existing)
   - Go to home screen
   - Fill booking form with test data
   - Submit

3. **Start Auto-Assignment**
   - Click purple "Auto-Assign All" button
   - Watch console logs

4. **Check Status Row**
   - Yellow row appears under booking
   - Shows "Active Call" with driver details

5. **Test Fallback**
   - Click "✗ Reject" button
   - Wait 2 seconds
   - New driver should be called
   - Status row updates with new driver

6. **Accept Final Driver**
   - Click "✓ Accept" button
   - Booking assigned
   - Status row disappears
   - Driver column shows assigned driver

## Troubleshooting

### Problem: No yellow status row appears
**Cause:** Queue table not created or no active calls
**Fix:**
1. Check if table exists: Supabase → Table Editor → `driver_assignment_queue`
2. If not exists, run migration SQL
3. Refresh browser

### Problem: "Reject" button doesn't call next driver
**Cause:** No more drivers in queue
**Fix:**
1. Check queue table: `SELECT * FROM driver_assignment_queue WHERE booking_id = 'xxx'`
2. Verify there are pending drivers (status = 'pending')
3. Check console for error messages

### Problem: Timer doesn't work (60 second fallback)
**Cause:** Browser tab in background or React component unmounted
**Fix:**
1. Keep browser tab active during test
2. Check console for "⏰ [Call Monitor] Started monitoring" message
3. If missing, monitoring service not started

### Problem: Driver already assigned but still showing "Not Assigned"
**Cause:** Real-time subscription not working or stale data
**Fix:**
1. Click "Refresh" button manually
2. Check browser console for subscription errors
3. Hard refresh page (Cmd+Shift+R / Ctrl+Shift+R)

## Key Features

### 1. Automatic Fallback (60 seconds)
- No manual intervention needed
- Automatically moves to next driver
- Continues until all 3 drivers tried

### 2. Manual Response Buttons
- Faster testing
- Immediate fallback on reject
- Instant assignment on accept

### 3. Real-time Status Updates
- Live call status display
- Position in queue (1 of 3, 2 of 3, etc.)
- Time when call was initiated

### 4. Smart Queue Management
- Only 1 active call at a time
- Automatic cancellation when driver accepts
- Fail-safe when no drivers available

## Next Steps

Once basic fallback is working:

1. **Adjust timeout** (currently 60 seconds):
   - Edit `/src/services/callMonitoring.js`
   - Change `CALL_TIMEOUT_SECONDS = 60` to your desired value

2. **Add webhook** (for production):
   - Webhook will capture actual driver response from Bolna
   - No need for manual buttons
   - Follow instructions in `/docs/DRIVER_FALLBACK_SYSTEM.md`

3. **Customize notifications**:
   - Add SMS to admin when all drivers reject
   - Email alerts for failed assignments
   - Dashboard notifications

## Demo Video Script

For recording demo:

```
1. Show bookings dashboard (0:00-0:10)
2. Click "Auto-Assign All" (0:10-0:15)
3. Show yellow status row appears (0:15-0:25)
   - Point out: Active call, driver name, position
4. Click "Reject" button (0:25-0:30)
5. Show next driver called immediately (0:30-0:40)
6. Click "Accept" button (0:40-0:45)
7. Show booking assigned, status row disappears (0:45-0:55)
8. Show driver column updated with assigned driver (0:55-1:00)
```

## Contact

If system not working:
1. Check console logs first
2. Check Supabase table `driver_assignment_queue`
3. Share console logs screenshot
