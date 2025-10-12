# Driver Fallback System Documentation

## Overview

The Driver Fallback System automatically assigns the nearest 3 drivers to a booking and calls them sequentially if the previous driver rejects or doesn't answer. This ensures maximum booking fulfillment rate.

## How It Works

### 1. Automatic Driver Queue Creation

When a new booking arrives:
1. System finds **3 nearest available drivers** based on GPS location
2. Creates a **queue table entry** for each driver with position (1, 2, 3)
3. Immediately calls the **first driver** (position 1)

### 2. Driver Call Flow

**Bolna AI calls the driver and asks:**
> "Are you available right now to take this case? Please answer yes or no."

**Driver Response Scenarios:**

#### Scenario A: Driver Says "YES"
- ✅ Booking is immediately assigned to this driver
- 📝 Database updates: `bookings.driver_id` and `bookings.status = 'assigned'`
- ❌ All other pending drivers in queue are cancelled
- 🎉 Process complete

#### Scenario B: Driver Says "NO"
- ❌ Queue entry marked as `rejected`
- 📞 System **automatically calls next driver** in queue (position 2)
- 🔄 Process repeats for next driver

#### Scenario C: Driver Doesn't Answer
- ⏰ Bolna call times out or fails
- 📝 Queue entry marked as `no_answer`
- 📞 System **automatically calls next driver** in queue (position 2)
- 🔄 Process repeats for next driver

#### Scenario D: All Drivers Reject/Don't Answer
- 🚫 All 3 drivers have been tried
- 📝 Booking status updated to `no_drivers_available`
- 📋 Remarks field updated with failure message
- 👨‍💼 Admin needs to manually intervene

## Architecture

### Database Schema

#### `driver_assignment_queue` Table
```sql
CREATE TABLE driver_assignment_queue (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  driver_id UUID REFERENCES drivers(id),
  position INT (1, 2, or 3),
  status TEXT ('pending', 'calling', 'accepted', 'rejected', 'no_answer', 'failed'),
  call_id TEXT (Bolna execution_id),
  response TEXT ('yes', 'no', or null),
  distance TEXT,
  called_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Example Queue Entries:**
| Position | Driver | Status | Distance | Called At |
|----------|--------|--------|----------|-----------|
| 1 | Driver A | rejected | 2.3 km | 14:30:00 |
| 2 | Driver B | calling | 3.1 km | 14:31:15 |
| 3 | Driver C | pending | 4.5 km | NULL |

### Flow Diagram

```
New Booking Created
       ↓
Find 3 Nearest Drivers (2.3km, 3.1km, 4.5km)
       ↓
Store in Queue Table (Position 1, 2, 3)
       ↓
Call Driver 1 (Position 1) ──→ Driver Says "YES" ──→ ✅ ASSIGN & DONE
       ↓
   Driver Says "NO" or No Answer
       ↓
Call Driver 2 (Position 2) ──→ Driver Says "YES" ──→ ✅ ASSIGN & DONE
       ↓
   Driver Says "NO" or No Answer
       ↓
Call Driver 3 (Position 3) ──→ Driver Says "YES" ──→ ✅ ASSIGN & DONE
       ↓
   Driver Says "NO" or No Answer
       ↓
❌ Mark Booking as "no_drivers_available"
```

## Implementation Files

### 1. Database Migration
**File:** `/supabase/migrations/create_driver_assignment_queue.sql`
- Creates `driver_assignment_queue` table
- Sets up indexes for performance
- Enables Row Level Security (RLS)
- Creates trigger for `updated_at` timestamp

### 2. Driver Assignment Service
**File:** `/src/services/driverAssignment.js`

**Key Functions:**

#### `storeDriverQueue(bookingId, drivers)`
Stores 3 nearest drivers in queue table with positions 1, 2, 3.

#### `callNextDriverInQueue(bookingId, bookingData)`
- Finds next pending driver in queue (ordered by position)
- Updates status to `calling`
- Makes Bolna API call
- Stores `execution_id` as `call_id` for tracking

#### `handleDriverResponse(callId, response)`
- Called by webhook when driver responds
- If "yes" → assigns booking
- If "no" or no answer → calls next driver
- If no more drivers → marks booking as failed

#### `autoAssignDriver(booking)` (Updated)
- Finds 3 nearest drivers
- Stores them in queue
- Calls first driver
- Returns queue info

### 3. Webhook Handler
**File:** `/supabase/functions/bolna-webhook/index.ts`

Supabase Edge Function that receives callbacks from Bolna.ai:
- Receives `execution_id` from Bolna
- Looks up queue entry by `call_id`
- Parses driver response from conversation data
- Handles "yes", "no", or "no_answer" scenarios
- Automatically calls next driver if needed

## Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration in Supabase:

```bash
# Via Supabase CLI
supabase db push

# OR manually in Supabase SQL Editor
# Copy and paste: /supabase/migrations/create_driver_assignment_queue.sql
```

### Step 2: Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the webhook function
supabase functions deploy bolna-webhook

# Set environment variables
supabase secrets set VITE_BOLNA_BASE_URL=https://api.bolna.ai
supabase secrets set VITE_BOLNA_CALLS_PATH=/call
supabase secrets set VITE_BOLNA_API_KEY=your-api-key
supabase secrets set VITE_BOLNA_DRIVER_AGENT_ID=e2223ced-67ac-4c9a-951c-7843111bc041
supabase secrets set VITE_BOLNA_FROM_NUMBER=+918035317767
```

### Step 3: Configure Bolna Agent Webhook

In your Bolna.ai dashboard for Driver Agent (`e2223ced-67ac-4c9a-951c-7843111bc041`):

1. Go to Agent Settings → Webhooks
2. Add webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/bolna-webhook
   ```
3. Set webhook events:
   - ✅ Call Completed
   - ✅ Call Failed
   - ✅ No Answer

4. Configure agent to capture response:
   - Add custom extraction rule for "driver_response"
   - Extract keywords: "yes", "no"

### Step 4: Update Bolna Agent Prompt

Your Bolna Driver Agent should ask:

```
Hello [driver_name], this is Raftaar Ambulance Alert.

We have an emergency booking:
- Booking ID: {booking_id}
- Patient Location: {victim_location}
- Nearest Hospital: {nearby_hospital}
- Distance from you: {distance}
- Patient Contact: {Phone_umber}

Are you available right now to take this case?
Please answer YES or NO.
```

**Important:** The agent must:
- Ask clear YES/NO question
- Capture driver response
- Send response in webhook payload

## Testing

### Test Case 1: Driver Accepts Immediately

1. Create new booking via dashboard
2. System finds 3 drivers, calls Driver 1
3. Driver 1 answers and says "Yes"
4. Verify:
   - ✅ Booking assigned to Driver 1
   - ✅ Queue entry status = "accepted"
   - ✅ Other queue entries = "cancelled"

### Test Case 2: First Driver Rejects, Second Accepts

1. Create new booking
2. Driver 1 says "No"
3. System automatically calls Driver 2
4. Driver 2 says "Yes"
5. Verify:
   - ✅ Queue position 1 = "rejected"
   - ✅ Queue position 2 = "accepted"
   - ✅ Queue position 3 = "cancelled"
   - ✅ Booking assigned to Driver 2

### Test Case 3: All Drivers Reject

1. Create new booking
2. All 3 drivers say "No" or don't answer
3. Verify:
   - ✅ All queue entries = "rejected" or "no_answer"
   - ✅ Booking status = "no_drivers_available"
   - ✅ Remarks field has failure message

## Monitoring

### Check Queue Status

```sql
-- View queue for a booking
SELECT
  q.position,
  d.first_name || ' ' || d.last_name AS driver_name,
  q.status,
  q.response,
  q.distance,
  q.called_at,
  q.responded_at
FROM driver_assignment_queue q
JOIN drivers d ON q.driver_id = d.id
WHERE q.booking_id = 'YOUR_BOOKING_ID'
ORDER BY q.position;
```

### Check Failed Assignments

```sql
-- Bookings with no drivers available
SELECT
  booking_id,
  address,
  created_at,
  status,
  remarks
FROM bookings
WHERE status = 'no_drivers_available'
ORDER BY created_at DESC;
```

### Check Driver Response Rates

```sql
-- Driver acceptance statistics
SELECT
  d.first_name || ' ' || d.last_name AS driver_name,
  COUNT(*) AS total_calls,
  SUM(CASE WHEN q.response = 'yes' THEN 1 ELSE 0 END) AS accepted,
  SUM(CASE WHEN q.response = 'no' THEN 1 ELSE 0 END) AS rejected,
  SUM(CASE WHEN q.status = 'no_answer' THEN 1 ELSE 0 END) AS no_answer
FROM driver_assignment_queue q
JOIN drivers d ON q.driver_id = d.id
WHERE q.status IN ('accepted', 'rejected', 'no_answer')
GROUP BY d.id, d.first_name, d.last_name
ORDER BY total_calls DESC;
```

## Troubleshooting

### Issue: Webhook Not Triggering

**Check:**
1. Webhook URL is correct in Bolna dashboard
2. Edge function is deployed: `supabase functions list`
3. Check function logs: `supabase functions logs bolna-webhook`

### Issue: Driver Response Not Captured

**Check:**
1. Bolna agent configured to capture "driver_response"
2. Webhook payload includes `conversation_data.driver_response`
3. Check Edge function logs for parsing errors

### Issue: Next Driver Not Called Automatically

**Check:**
1. Queue has pending drivers: `SELECT * FROM driver_assignment_queue WHERE booking_id = '...'`
2. Webhook is updating queue status correctly
3. Bolna API credentials are set in Edge function secrets

## Environment Variables Required

### Frontend (.env)
```env
VITE_BOLNA_BASE_URL=https://api.bolna.ai
VITE_BOLNA_API_KEY=bn-20eb9d8dd84e46f7976ac14eee6a9e74
VITE_BOLNA_DRIVER_AGENT_ID=e2223ced-67ac-4c9a-951c-7843111bc041
VITE_BOLNA_FROM_NUMBER=+918035317767
VITE_BOLNA_CALLS_PATH=/call
```

### Supabase Edge Function (Secrets)
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_BOLNA_BASE_URL=https://api.bolna.ai
VITE_BOLNA_CALLS_PATH=/call
VITE_BOLNA_API_KEY=bn-20eb9d8dd84e46f7976ac14eee6a9e74
VITE_BOLNA_DRIVER_AGENT_ID=e2223ced-67ac-4c9a-951c-7843111bc041
VITE_BOLNA_FROM_NUMBER=+918035317767
```

## Future Enhancements

1. **Smart Queue Reordering**: If driver 2 is much closer when driver 1 rejects, reorder queue
2. **Driver Performance Tracking**: Track acceptance rate and prioritize reliable drivers
3. **Time-based Fallback**: Auto-fallback after X seconds even without explicit "No"
4. **SMS Backup**: Send SMS to driver if call fails
5. **Admin Notifications**: Alert admin when all drivers reject
6. **Driver Pool Expansion**: If all 3 reject, find next 3 drivers automatically

## Support

For issues or questions:
- Check function logs: `supabase functions logs bolna-webhook --tail`
- Review queue status in Supabase dashboard
- Contact team lead for Bolna agent configuration access
