# 🧪 Testing Guide - Intelligent Driver Reassignment System

## 📋 What You Should See Now

After the latest updates, the system will **AUTOMATICALLY**:
1. ✅ Call victim when booking is created
2. ✅ Auto-assign 3 nearest drivers and call first driver
3. ✅ Wait for driver response and analyze transcript
4. ✅ If driver declines/no answer → Call next driver
5. ✅ If driver accepts → Assign, send WhatsApp, cancel others
6. ✅ Update dashboard with driver status in real-time

---

## 🚀 Step-by-Step Testing

### **STEP 1: Prepare Your Environment**

1. **Open Browser Console** (Press F12)
2. **Go to Bookings Page** (http://localhost:5173/bookings)
3. **Clear Console** to see fresh logs

---

### **STEP 2: Create a New Booking**

1. Go to **EmergencyLocation** page
2. Fill in:
   - **Patient Name**: Test Patient
   - **Phone**: Your test number
   - **Emergency Type**: Medical Emergency
   - **Click on map** to select location
   - **Select nearest hospital**
3. Click **"Submit Emergency Request"**

---

### **STEP 3: Watch Console Logs - Expected Flow**

#### **Phase 1: Booking Created (Immediately)**
```
🔥 [Bookings] Real-time event received: INSERT
➕ [Bookings] Adding new booking: EMG-1760267734701
📞 [Bookings] Triggering Bolna AI call for new booking
✅ [Bookings] Bolna call initiated (VICTIM CALL)
```

#### **Phase 2: Driver Assignment Starts (After 2 seconds)**
```
🚗 [Bookings] Auto-assigning drivers for new booking...
🚗 [Driver Assignment] Finding 3 nearest drivers for queue...
✅ [Driver Assignment] Found 3 driver(s)
📋 [Driver Queue] Storing fallback driver queue...
✅ [Driver Queue] Stored 3 drivers in queue
📞 [Driver Assignment] Calling first driver in queue...
📞 [Driver Queue] Calling driver: John Doe
✅ [Driver Queue] Driver call initiated successfully
```

#### **Phase 3: Intelligent Processing Starts**
```
🤖 [Driver Assignment] Starting intelligent transcript analysis...
🚀 [Intelligent Processing] Starting in background...
⏳ [Bolna Transcript] Waiting for call completion: <execution_id>
```

#### **Phase 4: Waiting for Call to Complete (Every 5 seconds)**
```
⏳ [Bolna Transcript] Call still in progress... (5s elapsed)
⏳ [Bolna Transcript] Call still in progress... (10s elapsed)
⏳ [Bolna Transcript] Call still in progress... (15s elapsed)
...
```

#### **Phase 5a: Driver ACCEPTS (Best Case)**
```
✅ [Bolna Transcript] Call completed!
🔍 [Bolna Transcript] Searching for execution: <id>
📊 [Bolna Transcript] Total executions available: 5
✅ [Bolna Transcript] Found execution: <id>
📄 [Bolna Transcript] Execution data: {...}
📝 [Bolna Transcript] Extracting transcript...
✅ [Bolna Transcript] Found conversation_data field
📄 [Bolna Transcript] FULL TRANSCRIPT: "user said yes okay I will come"
📏 [Bolna Transcript] Transcript length: 28 characters
🔍 [Bolna Transcript] Analyzing driver response...
📊 [Bolna Transcript] ===== ANALYSIS RESULT =====
   Response: ACCEPTED
   Confidence: high
   Reason: Found 2 positive indicators
   Keywords: ['yes', 'okay']
==========================================
✅ [Intelligent Reassignment] Driver ACCEPTED the booking!
✅ [Driver Acceptance] Processing driver acceptance...
📝 [Driver Acceptance] Assigned John Doe to booking
🚫 [Driver Acceptance] Cancelled other pending drivers
📱 [Driver Acceptance] Sending WhatsApp location to driver...
✅ [Driver Acceptance] WhatsApp location sent successfully!
```

#### **Phase 5b: Driver DECLINES / NO ANSWER (Fallback Case)**
```
✅ [Bolna Transcript] Call completed!
📄 [Bolna Transcript] FULL TRANSCRIPT: "no sorry I'm busy"
📊 [Bolna Transcript] ===== ANALYSIS RESULT =====
   Response: DECLINED
   Confidence: high
   Reason: Found 2 negative indicators
   Keywords: ['no', 'busy']
==========================================
❌ [Intelligent Reassignment] Driver DECLINED the booking
🔄 [Try Next Driver] Reason: declined
🔍 [Try Next Driver] Checking if driver already assigned...
📞 [Try Next Driver] No driver assigned yet, calling next driver in queue...
📞 [Driver Queue] Calling next driver in queue...
🔍 [Driver Queue] Finding next driver in queue...
✅ [Driver Queue] Found driver at position 2
📞 [Driver Queue] Calling driver: Jane Smith
✅ [Try Next Driver] Next driver called successfully
🚀 [Intelligent Processing] Starting in background...
⏳ [Bolna Transcript] Waiting for call completion...
```

---

## 📱 What You'll See in Dashboard

### **Bookings Page - Queue Status Component**

For each pending booking, you'll see an **expandable section** showing:

```
🚗 Driver Assignment Queue

#1 - John Doe                    ❌ Declined (Unavailable)
   📱 9876543210  🚗 Ambulance 101  📏 2.3 km
   Called: 11:15:30
   Responded: 11:15:45
   View Analysis ▼

#2 - Jane Smith                  📞 Calling...
   📱 9876543211  🚗 Ambulance 102  📏 3.1 km
   Called: 11:15:50

#3 - Bob Wilson                  ⏳ In Queue
   📱 9876543212  🚗 Ambulance 103  📏 4.5 km

Status: 📞 Calling driver... Waiting for response
```

### **Driver Column Updates**

When driver accepts, the **DRIVER column** will automatically update:

**Before:**
```
Driver: Not Assigned (yellow)
```

**After:**
```
Driver: John Doe
        Ambulance 101 (MH-12-AB-1234)
```

---

## 🔍 Troubleshooting - What If...

### **Problem 1: No Driver Assignment Happening**

**Expected Logs:**
```
🚗 [Bookings] Auto-assigning drivers for new booking...
```

**If Missing:**
- Check if booking has location data in remarks
- Look for error: `⚠️ [Driver Assignment] No location data in booking`
- **Solution:** Make sure you clicked on the map when creating booking

---

### **Problem 2: Transcript Not Fetching**

**Expected Logs:**
```
🔍 [Bolna Transcript] Searching for execution: <id>
📊 [Bolna Transcript] Total executions available: 5
```

**If You See:**
```
❌ [Bolna Transcript] Failed to fetch executions
```

**Possible Causes:**
1. Bolna API key is invalid
2. Agent ID is incorrect
3. Network issue

**Solution:**
Run this in console to test Bolna API:
```javascript
fetch('https://api.bolna.ai/v2/agent/e2223ced-67ac-4c9a-951c-7843111bc041/executions', {
  headers: {
    'Authorization': 'Bearer bn-20eb9d8dd84e46f7976ac14eee6a9e74',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ API works:', data))
.catch(err => console.error('❌ API failed:', err));
```

---

### **Problem 3: Transcript is Empty**

**You'll See:**
```
⚠️ [Bolna Transcript] No transcript found in execution
📋 [Bolna Transcript] Full execution object: {...}
```

**What to Do:**
1. Copy the full execution object from console
2. Look for fields like: `conversation_data`, `transcript`, `messages`
3. Share with me so I can update the extraction logic

---

### **Problem 4: Analysis Not Detecting "Yes"**

**You'll See:**
```
📄 [Bolna Transcript] FULL TRANSCRIPT: "driver said yes"
📊 Analysis: UNCLEAR
```

**Solution:**
The keywords might not match. Current keywords:
- **Positive:** yes, yeah, okay, sure, available, haan, ha, thik hai
- **Negative:** no, busy, can't, unable, nahi, nhi

If transcript has different words, I'll add them.

---

### **Problem 5: Next Driver Still Called After Acceptance**

**You Should See:**
```
✅ Driver ACCEPTED
🔄 [Try Next Driver] Reason: declined
🛑 [Try Next Driver] STOP! Driver already assigned to booking
```

**If Next Driver is Called:**
- This is a race condition bug
- The safety check should prevent this
- **Share console logs** so I can debug

---

## 📊 Database Verification

Check your Supabase database:

### **Query 1: View Queue for a Booking**
```sql
SELECT
  position,
  status,
  response,
  response_analysis,
  called_at,
  responded_at,
  drivers.first_name,
  drivers.last_name
FROM driver_assignment_queue
LEFT JOIN drivers ON driver_assignment_queue.driver_id = drivers.id
WHERE booking_id = '<YOUR_BOOKING_ID>'
ORDER BY position;
```

**Expected Result:**
```
| position | status   | response  | called_at           | responded_at        | first_name |
|----------|----------|-----------|---------------------|---------------------|------------|
| 1        | rejected | declined  | 2025-10-12 11:15:30 | 2025-10-12 11:15:45 | John       |
| 2        | accepted | accepted  | 2025-10-12 11:15:50 | 2025-10-12 11:16:10 | Jane       |
| 3        | cancelled| null      | null                | null                | Bob        |
```

### **Query 2: Check Response Analysis**
```sql
SELECT
  position,
  status,
  response_analysis::json->>'response' as analysis_response,
  response_analysis::json->>'confidence' as confidence,
  response_analysis::json->>'reason' as reason
FROM driver_assignment_queue
WHERE booking_id = '<YOUR_BOOKING_ID>'
ORDER BY position;
```

---

## ✅ Success Checklist

Your system is working correctly when:

- [ ] New booking automatically triggers driver assignment
- [ ] Console shows "Auto-assigning drivers for new booking"
- [ ] First driver is called immediately
- [ ] Status shows "Calling..." in queue component
- [ ] Transcript is fetched after call completes
- [ ] Analysis correctly detects YES/NO
- [ ] If declined: Next driver is called automatically
- [ ] If accepted: Driver name appears in dashboard immediately
- [ ] WhatsApp is sent to accepted driver
- [ ] Other pending drivers are cancelled
- [ ] No more drivers are called after acceptance

---

## 🐛 Share These Logs for Debugging

If something doesn't work, **copy and paste these sections** from console:

1. **Booking Creation Logs:**
   - Everything after `➕ [Bookings] Adding new booking`

2. **Driver Assignment Logs:**
   - Everything starting with `🚗 [Bookings] Auto-assigning drivers`

3. **Transcript Fetching Logs:**
   - Everything between `⏳ [Bolna Transcript] Waiting` and `========`

4. **Full Execution Object** (if transcript not found):
   - The JSON object printed after `📋 [Bolna Transcript] Full execution object`

---

## 🔧 Quick Fixes

### Enable More Verbose Logging (Optional)
Add this to browser console:
```javascript
localStorage.setItem('debug', 'bolna:*,intelligent:*,driver:*');
```

### Manually Test Driver Assignment
In Bookings page, click:
```
Auto-Assign All
```
This will manually trigger assignment for all pending bookings.

---

**Your system is now fully automated! Just create a booking and watch the magic happen! ✨**
