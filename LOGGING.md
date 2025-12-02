# Logging Guide

## How to View Logs

All authentication and logout events are logged to the browser console with clear prefixes:

- `[LOGOUT]` - Logout-related events
- `[AUTH INIT]` - Authentication initialization
- `[AUTH CHECK]` - Authentication status checks
- `[CALLBACK]` - Spotify callback handling
- `[LOGIN]` - Login process
- `[APP]` - App component state changes

## To View Logs:

1. **Open Browser Developer Tools** (F12 or Right-click → Inspect)
2. **Go to the Console tab**
3. **Filter logs** by typing `[LOGOUT]`, `[AUTH]`, etc. in the console filter

## To Export Logs:

1. Open the browser console
2. Type: `window.appLogger.exportLogs()` (if logger is available)
3. This will download a log file with all logged events

## Common Log Sequences:

### Successful Logout:
```
[LOGOUT] Context logout called
[LOGOUT] Starting logout process
[LOGOUT] Clearing tokens from localStorage
[LOGOUT] All tokens and code verifier cleared
[LOGOUT] State cleared, reloading page to prevent login loop
[LOGOUT] Current URL before redirect: ...
[LOGOUT] Current hash before redirect: ...
```

### Login Loop (if it happens):
```
[LOGOUT] Context logout called
...logout happens...
[APP] User not authenticated, showing Login component
[AUTH INIT] Checking authentication status
[AUTH CHECK] isAuthenticated: false
...then immediately...
[LOGIN] Initiating login process
[LOGIN] Redirecting to Spotify auth URL
[CALLBACK] Callback component mounted...
```

## If Login Loop Occurs:

Check the logs for:
1. Are tokens being cleared? (Look for `[LOGOUT] All tokens and code verifier cleared`)
2. Is the page reloading? (Check URL changes)
3. Is callback being triggered unexpectedly? (Look for `[CALLBACK]` logs)
4. Is authentication check happening after logout? (Look for `[AUTH CHECK]` logs)

## File Location:

Logs are stored in browser console memory. To persist logs:
1. Export logs using `window.appLogger.exportLogs()`
2. Or copy/paste console logs manually



