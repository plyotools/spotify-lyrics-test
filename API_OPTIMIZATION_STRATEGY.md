# API Call Optimization Strategy

## Current Issues
- **Polling every 3 seconds** = ~1,200 requests/hour
- Making requests even when nothing has changed
- Not using Web Playback SDK events when available
- Same polling frequency regardless of playback state

## Optimizations Implemented

### 1. **Adaptive Polling Intervals** ✅
**Different intervals based on playback state:**

| State | Initial Interval | After No Changes | Requests/Hour |
|-------|-----------------|------------------|---------------|
| Playing + Changes | 5 seconds | - | ~720 |
| Playing + No Changes | 5 seconds | → 15 seconds | ~240 |
| Paused | 10 seconds | → 30 seconds | ~120-360 |
| No Active Device | 30 seconds | 30 seconds | ~120 |

**Savings:** ~50-80% reduction in API calls

### 2. **Change Detection**
- Only resets polling interval when track or play state changes
- Increases interval after 3 consecutive polls with no changes
- Automatically reduces interval when activity resumes

### 3. **Smart Interval Adjustment**
```javascript
// Playing with changes: 5s (detect changes quickly)
// Playing with no changes: Gradually increase to 15s
// Paused: Start at 10s, increase to 30s
// No track: 30s (no need to check frequently)
```

## Additional Optimization Opportunities

### 4. **Web Playback SDK Events** (Future Enhancement)
When Web Playback SDK is available:
- Use `player_state_changed` events instead of polling
- Only poll occasionally for validation (every 30-60 seconds)
- **Potential savings:** 90-95% reduction when SDK active

### 5. **Request Batching** (Future)
- Batch multiple API calls when possible
- Cache track metadata (album art, artist info)
- Only fetch when track changes

### 6. **Smart Caching**
- Cache playback state for short periods
- Skip API call if cached state is still valid
- Use ETags/conditional requests if Spotify supports

## Expected Results

### Before Optimizations:
- **3-second polling** = 1,200 requests/hour
- Same frequency regardless of state

### After Current Optimizations:
- **Adaptive polling** = 120-720 requests/hour (avg ~300)
- **Reduction:** ~75% fewer API calls

### With Web Playback SDK Events (Future):
- **Event-driven** = ~60 requests/hour (occasional validation)
- **Reduction:** ~95% fewer API calls

## Best Practices Applied

1. ✅ **Adaptive Frequency**: Faster when active, slower when idle
2. ✅ **Change Detection**: Only poll frequently when things change
3. ✅ **Progressive Backoff**: Increase interval when no changes
4. ✅ **State-Aware**: Different strategies for different states
5. ✅ **User Experience**: Faster updates when user is actively listening

## Monitoring

Track these metrics to validate optimization:
- API requests per hour
- Rate limit occurrences
- User experience (lyrics sync accuracy)
- Response times

## Future Enhancements

1. **Web Playback SDK Event Integration**
   - Subscribe to `player_state_changed` events
   - Fall back to polling only when SDK unavailable
   - Reduce polling to 1-2 requests/minute for validation

2. **Predictive Polling**
   - Predict when track will change (near end of song)
   - Increase polling frequency before expected track change
   - Reduce frequency after track change confirmed

3. **Local State Tracking**
   - Track position client-side (already doing this)
   - Only poll for track changes, not position
   - Use position estimates based on timestamp

4. **Connection State Awareness**
   - Stop polling when tab is hidden/background
   - Resume polling when tab becomes active
   - Use Page Visibility API

