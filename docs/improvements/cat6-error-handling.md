# Category 6: Error Handling Improvements

## Problem
The application had three critical error handling gaps:
1. No process-level handlers for unhandled promise rejections or uncaught exceptions — fatal errors could crash silently
2. No Express global error middleware — unhandled route errors returned raw HTML stack traces
3. Only 2 ErrorBoundary placements (App root + Editor) — a sidebar crash would replace the entire application

## Improvement 1: Process-Level Error Handlers

**File:** `api/src/index.ts`

### What Changed
Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers that log the error and exit with code 1.

### Reproduction Steps
1. Add a rejected promise with no `.catch()` in any route handler:
   ```typescript
   // Simulate in any route
   Promise.reject(new Error('test unhandled rejection'));
   ```
2. **Before:** Node.js logs `UnhandledPromiseRejectionWarning` to stderr but process continues running in an undefined state. Future requests may silently fail.
3. **After:** Error is logged with full stack trace via `console.error`, then `process.exit(1)` is called. The process manager (PM2, systemd, or Elastic Beanstalk) restarts the process in a clean state.

### Before/After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Unhandled promise rejection | Warning logged, process continues in undefined state | Error logged, process exits cleanly (code 1), restart by process manager |
| Uncaught exception | Process crashes with unformatted stack trace | Error logged with timestamp, graceful exit with code 1 |
| Database connection lost mid-request | Silent failure on subsequent requests | Logged and process restarted with fresh connections |

---

## Improvement 2: Express Global Error-Handling Middleware

**File:** `api/src/app.ts`

### What Changed
Added a 4-argument `(err, req, res, next)` error middleware at the end of the Express middleware chain. Returns consistent JSON error responses with `{ error, message }` format.

### Reproduction Steps
1. Trigger a CSRF validation error by sending a POST without a CSRF token:
   ```bash
   curl -X POST http://localhost:3000/api/issues \
     -H 'Content-Type: application/json' \
     -b 'session_id=valid-session' \
     -d '{"title":"test"}'
   ```
2. **Before:** Returns raw HTML error page:
   ```html
   <!DOCTYPE html><html><body><pre>ForbiddenError: invalid csrf token
     at csrfSync (...)
   </pre></body></html>
   ```
3. **After:** Returns structured JSON:
   ```json
   { "error": "Forbidden", "message": "invalid csrf token" }
   ```
   In production mode, internal error details are hidden:
   ```json
   { "error": "Internal Server Error" }
   ```

### Before/After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| CSRF token missing | HTML stack trace (leaks file paths) | JSON `{ error: "Forbidden" }` |
| Route throws unhandled error | Connection hangs or HTML 500 | JSON `{ error: "Internal Server Error" }` |
| Middleware error (e.g., body-parser) | Raw error page | JSON with appropriate status code preserved |
| Production error details | Stack trace exposed to client | Hidden (logged server-side only) |

---

## Improvement 3: Granular ErrorBoundary in Sidebar

**File:** `web/src/pages/App.tsx`

### What Changed
Wrapped sidebar content (`DocumentsTree`, `IssuesSidebar`, `ProjectsList`) in a dedicated `<ErrorBoundary>` component. Previously, a sidebar crash would bubble up to the root ErrorBoundary and replace the entire application.

### Reproduction Steps
1. Introduce a render error in any sidebar component (e.g., accessing `.map()` on `undefined` data):
   ```typescript
   // In DocumentsTree.tsx, simulate:
   const items = undefined as any;
   return items.map(i => <div>{i.title}</div>);
   ```
2. **Before:** The root ErrorBoundary catches the error. The entire page (editor, properties panel, all navigation) is replaced with a generic error message. Any unsaved work in the editor is lost.
3. **After:** Only the sidebar panel shows an error message with a "Reload" link. The editor remains functional — users can still save their work before refreshing.

### Before/After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Sidebar component crashes | Entire app replaced by error screen | Only sidebar shows error; editor remains usable |
| Unsaved editor content during sidebar crash | Lost (editor unmounted) | Preserved (editor stays mounted) |
| User recovery action | Must reload entire page, losing state | Can save work, then click "Reload" link in sidebar |
| Error containment | 2 boundaries (root + editor) | 3 boundaries (root + editor + sidebar) |

## Testing
- All API unit tests pass (451 tests)
- No type errors (`npx tsc --noEmit`)
- Web builds successfully (`npx vite build`)
