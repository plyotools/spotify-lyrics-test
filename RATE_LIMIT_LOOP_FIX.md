# Rate Limit Loop Fix

## Problem
The app was stuck in a rate limit loop:
- Getting rate limited (429 error)
- Waiting only 3 seconds
- Retrying immediately
- Getting rate limited again
- Loop continues indefinitely

## Root Cause
1. Initial backoff was only 3 seconds (too short)
2. After backoff, immediately retried without extra buffer
3. Polling continued during backoff period
4. No protection against immediate re-rate-limiting

## Fixes Applied

### 1. **Stop All Polling When Rate Limited** ✅
- Clears all pending timeouts immediately
- Sets `isBackingOff = true` to block all requests
- Prevents any new requests during backoff

### 2. **Minimum 30-Second Backoff** ✅
- Changed from 3 seconds → **30 seconds minimum**
- Uses `Retry-After` header if provided (with 30s minimum)
- Exponential backoff: 30s → 60s → 120s → 240s → 300s (5 min max)

### 3. **Extra Buffer After Backoff** ✅
- After backoff period ends, waits **additional 30 seconds** before resuming
- Prevents immediate re-rate-limiting
- Ensures Spotify's rate limit window has fully reset

### 4. **Maximum Polling Interval After Rate Limit** ✅
- Sets polling interval to **5 minutes** after rate limit
- Prevents aggressive polling from causing another rate limit
- Gradually recovers as time passes without errors

### 5. **No Immediate Retry** ✅
- After backoff, doesn't call `updatePlayback()` directly
- Instead, resumes normal polling at maximum interval
- Lets the system recover naturally

## New Behavior

### When Rate Limited:
1. **Immediately stops all polling**
2. **Clears cache** to prevent stale data
3. **Waits minimum 30 seconds** (or `Retry-After` if longer)
4. **Sets polling to 5 minutes** maximum interval
5. **Waits extra 30 seconds** before resuming
6. **Resumes at slowest polling rate** (5 minutes)

### Example Timeline:
```
Time 0s:   Rate limited (429)
Time 0s:   Stop all polling, wait 30s minimum
Time 30s:  Backoff ends, wait extra 30s buffer
Time 60s:  Resume polling at 5-minute intervals
Time 360s: If successful, gradually speed up
```

## Result

✅ **No more loops** - Backoff is long enough to let rate limit reset
✅ **Extra safety buffer** - 30-second buffer prevents immediate re-rate-limiting
✅ **Maximum interval** - 5-minute polling prevents aggressive requests
✅ **Gradual recovery** - System recovers naturally over time

The rate limit loop should now be completely eliminated!
