# Fix: "No API key found in request" Error

## Problem
Getting error: `{"message":"No API key found in request","hint":"No apikey request header or url param was found."}`

## Root Cause
Your `.env` file has the correct Supabase URL and ANON_KEY, but the Vite dev server needs to be restarted to pick up environment variable changes.

## Current Configuration (✅ Correct)
```env
VITE_SUPABASE_URL=https://feuqkbefbfqnqkkfzgwt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Solution: Restart Dev Server

### Option 1: Via Terminal (Recommended)
1. Go to the terminal where `npm run dev` is running
2. Press `Ctrl + C` to stop the server
3. Run again:
```bash
npm run dev
```

### Option 2: Kill and Restart
```bash
# Kill the current Vite process
pkill -f "vite"

# Start dev server again
npm run dev
```

### Additional Step: Clear Browser Cache
After restarting the server:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Right-click on refresh button
3. Select **"Empty Cache and Hard Reload"**

OR simply:
- Press `Cmd + Shift + R` (Mac)
- Press `Ctrl + Shift + R` (Windows/Linux)

## Why This Happens
- Vite loads environment variables only when the dev server starts
- If you add/modify `.env` file while server is running, it won't pick up changes
- You must restart the server for changes to take effect

## Verification
After restart, check browser console:
```javascript
// These should show values, not undefined
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

## If Error Persists
1. Make sure `.env` file is in the root directory (same level as `package.json`)
2. Verify no typos in variable names (must be `VITE_` prefix)
3. Check if `.env` is in `.gitignore` (it should be)
4. Try deleting `node_modules/.vite` cache:
```bash
rm -rf node_modules/.vite
npm run dev
```
