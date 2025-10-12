# Database Setup for Intelligent Driver Reassignment

This document outlines the database schema updates needed for the intelligent driver reassignment feature.

## Required Tables

### 1. `driver_assignment_queue` (Update existing table)

Add these columns if they don't exist:

```sql
-- Add response analysis column to store transcript analysis JSON
ALTER TABLE driver_assignment_queue
ADD COLUMN IF NOT EXISTS response_analysis TEXT;

-- Add responded_at timestamp
ALTER TABLE driver_assignment_queue
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
```

**Existing columns** (should already be there):
- `id` (UUID, primary key)
- `booking_id` (UUID, foreign key to bookings)
- `driver_id` (UUID, foreign key to drivers)
- `position` (INTEGER) - Position in queue (1, 2, 3)
- `status` (TEXT) - Status: pending, calling, accepted, rejected, no_answer, unclear, cancelled, failed
- `call_id` (TEXT) - Bolna execution_id
- `distance` (TEXT) - Distance in km
- `called_at` (TIMESTAMPTZ)
- `response` (TEXT) - Driver's response: yes, no, timeout, declined, unclear
- `created_at` (TIMESTAMPTZ)

---

### 2. `bookings` table (Update existing table)

Add WhatsApp tracking columns:

```sql
-- Add WhatsApp tracking columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT; -- sent, delivered, read, failed
```

---

## Supabase Setup Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Update Query

Copy and paste this complete SQL:

```sql
-- Update driver_assignment_queue table
ALTER TABLE driver_assignment_queue
ADD COLUMN IF NOT EXISTS response_analysis TEXT;

ALTER TABLE driver_assignment_queue
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Update bookings table for WhatsApp tracking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;
dricdr
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_queue_booking_status
ON driver_assignment_queue(booking_id, status);

CREATE INDEX IF NOT EXISTS idx_queue_call_id
ON driver_assignment_queue(call_id);

-- Add comment for documentation
COMMENT ON COLUMN driver_assignment_queue.response_analysis IS 'JSON string containing transcript analysis result from Bolna.ai';
COMMENT ON COLUMN driver_assignment_queue.responded_at IS 'Timestamp when driver responded to the call';
COMMENT ON COLUMN bookings.whatsapp_sent IS 'Whether WhatsApp location was sent to assigned driver';
COMMENT ON COLUMN bookings.whatsapp_sent_at IS 'Timestamp when WhatsApp was sent';
```

### Step 3: Click "RUN" button

---

## How It Works

### Flow Diagram

```
1. Booking Created
   ↓
2. Find 3 Nearest Drivers → Store in Queue
   ↓
3. Call Driver #1 (Bolna.ai)
   ↓
4. Wait for Call Completion (120s max)
   ↓
5. Fetch Transcript from Bolna.ai
   ↓
6. Analyze Transcript (AI Detection)
   ├─ "ACCEPTED" → Assign Driver + Send WhatsApp Location ✅
   ├─ "DECLINED" → Call Driver #2 🔄
   ├─ "UNCLEAR" → Call Driver #2 🔄
   └─ "NO_RESPONSE" → Call Driver #2 🔄
   ↓
7. Repeat until driver accepts or queue exhausted
```

### Database State Tracking

**Queue Status Values:**
- `pending` - Driver in queue, not called yet
- `calling` - Call in progress
- `accepted` - Driver accepted (WhatsApp sent)
- `rejected` - Driver declined
- `no_answer` - Driver didn't answer or timeout
- `unclear` - Driver response unclear
- `cancelled` - Cancelled after another driver accepted
- `failed` - Call failed technically

**Response Analysis JSON Format:**
```json
{
  "response": "ACCEPTED" | "DECLINED" | "UNCLEAR" | "NO_RESPONSE",
  "confidence": "high" | "medium" | "low",
  "reason": "Found 2 positive indicators",
  "keywords": ["yes", "okay"]
}
```

---

## Verification

After running the SQL, verify the columns exist:

```sql
-- Check driver_assignment_queue columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'driver_assignment_queue';

-- Check bookings columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name LIKE 'whatsapp%';
```

---

## Done! ✅

Your database is now ready for intelligent driver reassignment with transcript analysis and WhatsApp integration.
