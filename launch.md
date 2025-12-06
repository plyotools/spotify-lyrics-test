# Launch Instructions

**CRITICAL**: This file contains the EXACT steps you MUST follow. Read this entire file before starting.

When the user says **"launch it"** or **"launch"**, follow these steps in order and **SHOW PROOF** of each step:

**VERIFICATION**: After completing all steps, the user can verify you followed them by checking:
- `.cursor/ports.json` exists with port assignments
- `.dev.log` exists with service startup logs
- Ports appear in Control Center dashboard
- Your response includes "Control Center Status" confirmation

## Step 1: Sync with Control Center
```bash
ccc sync-project --path . --services web,api
```

**PROOF REQUIRED**: Show the output of this command, including:
- Rules version synced
- Ports allocated (e.g., "web: 5100, api: 8000")

**Example proof:**
```
✓ Synced with Control Center
  Rules Version: 2025.01.01-03
  Ports allocated:
    web: 5100
    api: 8000
```

## Step 2: Start Services
Read port assignments from `.cursor/ports.json`, then start services:
```bash
npm run dev:all > .dev.log 2>&1 &
```
Or if only specific services:
- `npm run dev:web > .dev.log 2>&1 &` (frontend only)
- `npm run dev:api > .dev.log 2>&1 &` (backend only)

**CRITICAL**: Always redirect output to `.dev.log` and run in background with `&`.

**PROOF REQUIRED**: Confirm the command was executed:
```
✓ Started services in background (output to .dev.log)
```

## Step 3: Verify Services Started
Wait 2-3 seconds, then check `.dev.log`:
```bash
cat .dev.log | tail -20
```

**PROOF REQUIRED**: Show relevant lines from `.dev.log` that prove services started:
- Show the actual log lines containing "Server running", "Listening on", etc.
- Extract and display the ACTUAL ports from the log

**Example proof:**
```
✓ Verified services started in .dev.log:
  [VITE] Server running at http://localhost:5173
  [API] Listening on port 3002
  
  Actual ports detected:
  - Frontend: 5173
  - Backend: 3002
```

If the log shows errors or is empty, the service did NOT start. Report this to the user and stop.

## Step 4: Report Actual Ports to Control Center (ALWAYS REQUIRED)

**CRITICAL**: You MUST report ports to Control Center. Do this in one of two ways:

**Option A**: If actual ports differ from `.cursor/ports.json`, report them explicitly:
```bash
ccc report-ports --path . --ports web:5173,api:3002
```
Use the ACTUAL ports you found in `.dev.log`, not the allocated ones.

**Option B**: Call `ccc launch-project` (Step 5) which will report ports automatically.

**PROOF REQUIRED**: Show the output confirming ports were reported:
```
✓ Ports reported successfully:
  web: 5173 (http://localhost:5173)
  api: 3002 (http://localhost:3002)
```

**VERIFICATION**: User can verify by running: `ccc show-ports | grep "$(pwd)"` or checking CCC dashboard.

## Step 5: Launch and Open Browser (ALWAYS REQUIRED)
```bash
ccc launch-project --path . --no-sync
```
This will:
- **ALWAYS report ports from `.cursor/ports.json` to Control Center** (even if services aren't running yet)
- Verify services are responding
- Open the browser automatically

**CRITICAL**: This command ALWAYS reports ports to Control Center. Even if the service check fails, ports are still reported.

**PROOF REQUIRED**: Show the COMPLETE output of this command, including:
- Port verification status
- "Ports reported to Control Center: web:XXXX,api:XXXX" line
- Browser opening confirmation

**Example proof:**
```
✓ Launch successful!
  Service: web
  Port: 5173
  URL: http://localhost:5173
  Ports reported to Control Center: web:5173,api:3002
  Running services: web:5173,api:3002
  ✓ Browser opened successfully
  ✓ Ports are now visible in the Control Center dashboard
```

**VERIFICATION**: User can verify ports were reported by:
1. Checking CCC dashboard - ports should appear under this project
2. Running: `ccc show-ports | grep "$(pwd)"`

## Step 6: Final Confirmation in Your Response (REQUIRED)

**YOU MUST END YOUR RESPONSE WITH THIS SUMMARY:**

```
---
## Launch Complete ✓

**Services Running:**
- Frontend: http://localhost:5173 — responding
- Backend API: http://localhost:3002 — responding

**Control Center Status:**
✓ Ports have been reported to Control Center:
  - Frontend (web): http://localhost:5173
  - Backend API (api): http://localhost:3002
✓ These ports are now visible in the Control Center dashboard

**Browser:**
✓ Opened automatically — The app should be visible in your default browser

The app is ready to use.
```

Replace the ports with the ACTUAL ports from your `.dev.log`.

If any step failed, clearly state what failed and what succeeded.

## Important Notes

- **SHOW PROOF OF EVERY STEP** - Don't just say "done", show the actual output/evidence
- **NEVER skip the Control Center confirmation** - it's required
- Always extract ACTUAL ports from `.dev.log`, not assumed ports
- Always verify services started before proceeding - show the log evidence
- The browser MUST open automatically - never ask the user to open it manually
- If a step fails, show the error output so the user knows what went wrong
- Be transparent - show what actually happened, not just what should have happened

