# ⚠️ IMPORTANT: Run This SQL First!

## Error You're Seeing:
```
"No API key found in request"
"No `apikey` request header or url param was found."
```

## Root Cause:
Table `driver_assignment_queue` doesn't exist in your database yet!

## Solution (2 Minutes):

### Step 1: Open Supabase Dashboard
```
1. Go to: https://supabase.com/dashboard
2. Select your project: feuqkbefbfqnqkkfzgwt
3. Click "SQL Editor" in left sidebar
```

### Step 2: Create New Query
```
Click the green "+ New Query" button (top right)
```

### Step 3: Copy This SQL

**Copy the ENTIRE content of this file:**
`supabase/migrations/create_driver_assignment_queue.sql`

**OR copy this SQL directly:**

```sql
-- Driver Assignment Queue Table
-- Stores fallback driver list for automatic driver assignment with retry logic
-- If first driver says "No" or doesn't answer, system automatically calls next driver

CREATE TABLE IF NOT EXISTS public.driver_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  position INT NOT NULL, -- 1 = first driver, 2 = second fallback, 3 = third fallback
  status TEXT NOT NULL DEFAULT 'pending', -- pending, calling, accepted, rejected, no_answer, failed
  call_id TEXT, -- Bolna execution_id for tracking the call
  response TEXT, -- Driver's response: "yes", "no", or null
  called_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  distance TEXT, -- Distance from driver to booking location
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_booking_driver UNIQUE(booking_id, driver_id),
  CONSTRAINT valid_position CHECK (position >= 1 AND position <= 3),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'calling', 'accepted', 'rejected', 'no_answer', 'failed'))
);

-- Indexes for faster queries
CREATE INDEX idx_queue_booking_position ON public.driver_assignment_queue(booking_id, position);
CREATE INDEX idx_queue_status ON public.driver_assignment_queue(status);
CREATE INDEX idx_queue_call_id ON public.driver_assignment_queue(call_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.driver_assignment_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users"
ON public.driver_assignment_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_queue_timestamp
BEFORE UPDATE ON public.driver_assignment_queue
FOR EACH ROW
EXECUTE FUNCTION update_driver_queue_updated_at();

-- Comments
COMMENT ON TABLE public.driver_assignment_queue IS 'Queue for automatic driver assignment with fallback logic';
COMMENT ON COLUMN public.driver_assignment_queue.position IS 'Priority order: 1 = first driver, 2 = second fallback, 3 = third fallback';
COMMENT ON COLUMN public.driver_assignment_queue.status IS 'Current status: pending, calling, accepted, rejected, no_answer, failed';
COMMENT ON COLUMN public.driver_assignment_queue.call_id IS 'Bolna API execution_id for tracking the call';
COMMENT ON COLUMN public.driver_assignment_queue.response IS 'Driver response: yes, no, or null if no answer';
```

### Step 4: Run The Query
```
1. Paste the SQL into the editor
2. Click "RUN" button (bottom right)
3. Wait for success message ✅
```

### Step 5: Verify Table Created
```
1. Click "Table Editor" in left sidebar
2. Look for "driver_assignment_queue" table
3. Should show 0 rows
```

### Step 6: Refresh Browser
```
1. Go back to your app: http://localhost:5173/dashboard/bookings
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Error should be gone! ✅
```

## After SQL is Run:

The error will disappear and you'll see:
- "No active call" message (gray box) ← This is GOOD!
- Yellow box only appears when driver is being called

## Screenshot Proof:

### Before SQL (Error):
```
"No API key found in request"
Browser shows: https://feuqkbefbfqnqkkfzgwt.supabase.co/rest/v1/driver_assignment_queue?select=...
Status: 400 Bad Request
```

### After SQL (Working):
```
Console: "No active call" or "Active Call - Driver Name"
Browser: No errors
Status: 200 OK
```

## Still Getting Error?

### Check 1: Table Exists?
```sql
-- Run this in SQL Editor:
SELECT * FROM driver_assignment_queue LIMIT 1;

-- If error "relation does not exist" → SQL not run properly
-- If returns empty or data → Table exists ✅
```

### Check 2: RLS Enabled?
```sql
-- Run this to check policies:
SELECT * FROM pg_policies WHERE tablename = 'driver_assignment_queue';

-- Should show 1 policy: "Enable all operations for authenticated users"
```

### Check 3: Still Not Working?
1. Clear browser cache
2. Restart dev server: `npm run dev`
3. Check console for new errors
4. Share screenshot

## Why This Happened:

The system tried to query a table that doesn't exist yet. Supabase returned a misleading error message about "API key" when actually the problem was "table not found".

## Prevention:

Always run SQL migrations BEFORE testing new features that depend on database changes!

---

**Next Step:** Once SQL is run successfully, go to `HOW_TO_TEST_FALLBACK.md` for testing instructions.
