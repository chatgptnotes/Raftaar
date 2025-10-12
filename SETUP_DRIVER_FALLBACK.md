# Driver Fallback System - Setup Guide

## Quick Setup Steps

### Step 1: Run Database Migration

Copy and paste this SQL in your Supabase SQL Editor:

**File Location:** `/supabase/migrations/create_driver_assignment_queue.sql`

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Click "New query"
# 3. Copy entire contents of create_driver_assignment_queue.sql
# 4. Click "Run"
# 5. Verify table created: Check "Table Editor" → "driver_assignment_queue"
```

### Step 2: Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to your Supabase account
supabase login

# Link to your project (find project-ref in Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the webhook function
supabase functions deploy bolna-webhook

# Set environment secrets (required for webhook to work)
supabase secrets set \
  VITE_BOLNA_BASE_URL=https://api.bolna.ai \
  VITE_BOLNA_CALLS_PATH=/call \
  VITE_BOLNA_API_KEY=bn-20eb9d8dd84e46f7976ac14eee6a9e74 \
  VITE_BOLNA_DRIVER_AGENT_ID=e2223ced-67ac-4c9a-951c-7843111bc041 \
  VITE_BOLNA_FROM_NUMBER=+918035317767
```

### Step 3: Configure Bolna Webhook

Your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/bolna-webhook
```

**In Bolna.ai Dashboard:**
1. Go to your Driver Agent settings (ID: `e2223ced-67ac-4c9a-951c-7843111bc041`)
2. Navigate to **Webhooks** section
3. Add webhook URL (above)
4. Select events:
   - ✅ Call Completed
   - ✅ Call Failed
   - ✅ No Answer
5. Save configuration

### Step 4: Update Bolna Agent Prompt

Make sure your Bolna Driver Agent includes this question:

```
Are you available right now to take this case?
Please answer YES or NO.
```

And configure the agent to:
- Capture the "yes" or "no" response
- Include it in webhook payload as `conversation_data.driver_response`

### Step 5: Test the System

1. **Create a test booking** in your dashboard
2. **Watch the console** for logs:
   - "Finding 3 nearest drivers"
   - "Calling first driver in queue"
3. **Check Supabase logs** for webhook calls:
   ```bash
   supabase functions logs bolna-webhook --tail
   ```
4. **Verify queue table**:
   ```sql
   SELECT * FROM driver_assignment_queue
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Verification Checklist

- [ ] Database table `driver_assignment_queue` exists in Supabase
- [ ] Edge function deployed and showing in Supabase Functions dashboard
- [ ] Environment secrets set correctly (check with `supabase secrets list`)
- [ ] Webhook URL added to Bolna.ai dashboard
- [ ] Bolna agent asks "yes or no" question
- [ ] Test booking creates 3 queue entries
- [ ] First driver receives call
- [ ] Webhook logs show in Supabase (check function logs)

## Testing Scenarios

### Scenario 1: Driver Accepts ✅
1. Create booking
2. Driver 1 called
3. Driver says "Yes"
4. **Expected Result:**
   - Booking assigned to Driver 1
   - Status = "assigned"
   - Other drivers cancelled

### Scenario 2: First Rejects, Second Accepts 🔄
1. Create booking
2. Driver 1 says "No"
3. Driver 2 automatically called
4. Driver 2 says "Yes"
5. **Expected Result:**
   - Driver 1 queue entry = "rejected"
   - Booking assigned to Driver 2
   - Driver 3 cancelled

### Scenario 3: All Reject ❌
1. Create booking
2. All 3 drivers say "No"
3. **Expected Result:**
   - All queue entries = "rejected"
   - Booking status = "no_drivers_available"
   - Remarks updated with failure message

## Troubleshooting

### Problem: Webhook not receiving calls

**Solution:**
```bash
# Check function logs
supabase functions logs bolna-webhook --tail

# Verify webhook URL in Bolna dashboard
# Test webhook manually:
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/bolna-webhook \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"test-123","status":"success"}'
```

### Problem: Next driver not called automatically

**Solution:**
1. Check Edge function logs for errors
2. Verify Bolna webhook payload includes `execution_id`
3. Check queue table has pending drivers:
   ```sql
   SELECT * FROM driver_assignment_queue
   WHERE status = 'pending';
   ```

### Problem: Driver response not captured

**Solution:**
1. Bolna agent must ask explicit YES/NO question
2. Check webhook payload structure in function logs
3. Verify `conversation_data.driver_response` exists in payload

## File Structure

```
/Users/apple/Movies/Raftaar/Raftaar/
├── supabase/
│   ├── migrations/
│   │   └── create_driver_assignment_queue.sql    ← Database schema
│   └── functions/
│       └── bolna-webhook/
│           └── index.ts                           ← Webhook handler
├── src/
│   └── services/
│       ├── driverAssignment.js                    ← Updated with queue logic
│       └── bolnaService.js                        ← Driver call function
├── docs/
│   └── DRIVER_FALLBACK_SYSTEM.md                  ← Full documentation
└── SETUP_DRIVER_FALLBACK.md                       ← This file
```

## Next Steps After Setup

1. Monitor first few bookings closely
2. Check queue table after each booking
3. Review webhook logs for any errors
4. Adjust Bolna agent prompt if needed
5. Track driver acceptance rates

## Support Resources

- **Full Documentation:** `/docs/DRIVER_FALLBACK_SYSTEM.md`
- **Supabase Functions Logs:** `supabase functions logs bolna-webhook`
- **Database Monitoring:** Check `driver_assignment_queue` table in Supabase
- **Bolna Dashboard:** https://app.bolna.ai

---

**Note:** The system is fully automatic once set up. No manual intervention needed unless all 3 drivers reject a booking.
