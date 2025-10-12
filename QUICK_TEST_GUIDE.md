# 🚀 Quick Test Guide - Webhook Fix

## ⚡ One-Command Test:

```bash
# Restart app
npm run dev
```

## 📋 What to Watch:

### In Browser Console (F12):

**Look for these logs:**
```javascript
🔔 [Bolna Driver] Webhook URL: https://xxx.supabase.co/functions/v1/bolna-webhook
📦 [Bolna Driver] Payload: { ..., webhook_url: "..." }
⏳ [Intelligent Reassignment] Waiting for call completion...
🔔 [Intelligent Reassignment] Webhook should notify us instantly!
```

### Expected Timeline:

```
[0s]   📞 Driver call initiated
[1s]   🔔 Webhook URL sent to Bolna
[2-5s] ✅ Webhook receives notification
[3-6s] ⚡ Driver assigned to booking
[4-7s] 📱 WhatsApp sent
```

**Before:** 120+ seconds
**Now:** 3-7 seconds ⚡

---

## ✅ Success Indicators:

1. **Webhook URL appears in logs** ✅
2. **Response within 10 seconds** ✅
3. **No duplicate driver calls** ✅
4. **WhatsApp sent immediately** ✅

---

## 🆘 If Something Goes Wrong:

### Still timing out?

```bash
# Check webhook function is deployed
npx supabase functions list

# Redeploy if needed
npx supabase functions deploy bolna-webhook
```

### Webhook not called?

Check Supabase Dashboard:
- Edge Functions → bolna-webhook → Logs
- Should see incoming requests

### Still calling multiple drivers?

Check console:
- Look for "🛑 STOP!" messages
- These prevent duplicate calls

---

## 📞 Test Commands:

```javascript
// In browser console - check webhook URL
console.log(import.meta.env.VITE_SUPABASE_URL);
// Should output: https://your-project.supabase.co
```

---

## 🎯 Expected vs Actual:

| Expected | Actual | Status |
|----------|--------|--------|
| Webhook URL in payload | Check console | ⏳ Test |
| Response < 10s | Check timestamp | ⏳ Test |
| Single driver assigned | Check bookings table | ⏳ Test |
| No duplicate calls | Check queue status | ⏳ Test |

---

**Quick Start:** Just restart app and create a booking! 🚀
