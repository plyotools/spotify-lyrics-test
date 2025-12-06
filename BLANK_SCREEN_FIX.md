# Blank Screen Fix

## Issue
User reports seeing nothing after logging in, even though logs show authentication is successful.

## Changes Made

### 1. **Added Visible Waiting Message** ✅
- Added "Waiting for playback..." message when no track is available
- Styled with high contrast (white, large font) to ensure visibility
- Appears above the vinyl record

### 2. **Reduced Initial Delay** ✅
- Changed from 60 seconds → **5 seconds** before first API call
- Faster response time for better user experience
- Still conservative enough to avoid immediate rate limiting

### 3. **Always Show Vinyl** ✅
- Vinyl record always displays when no lyrics are available
- Visible indicator that app is loaded and waiting

## What User Should See Now

1. **Green Info Banner** (if SDK unavailable):
   - "💡 Tip: Enable Web Playback SDK..."
   - "Click here to re-authenticate" button

2. **Waiting Message**:
   - "Waiting for playback..." in white text

3. **Vinyl Record**:
   - Spinning vinyl record (lp.png)
   - Album art on top (if track is playing)

4. **After 5 seconds**:
   - First API call attempts to fetch playback state
   - If track is playing, track info and lyrics appear
   - If no track, waiting message remains

## SDK Scope Issue

The user is still seeing "Invalid token scopes" even after re-authentication. This means:

1. **They need to completely log out** (click logout button, clear all tokens)
2. **Then log back in** through the full OAuth flow
3. **Make sure they approve ALL scopes** including "streaming" when Spotify prompts

The app IS requesting the `streaming` scope (see `src/services/auth.ts` line 79), but the user's current token doesn't have it because:
- They may have logged in before the scope was added
- They may have used cached tokens
- They may have declined the scope during authorization

## Next Steps for User

1. Click the logout button (bottom-right corner, invisible but clickable)
2. Wait for full logout
3. Click "Connect with Spotify" again
4. **Approve all requested permissions** including streaming
5. The SDK should then initialize successfully

## Current State

- ✅ App renders correctly
- ✅ Waiting message visible
- ✅ Vinyl always shows
- ✅ 5-second initial delay (faster startup)
- ⚠️ User needs to re-authenticate to get streaming scope






