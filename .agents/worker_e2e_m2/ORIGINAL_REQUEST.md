## 2026-06-27T14:14:21+05:30
You are teamwork_preview_worker. Your task is to implement the Tier 1 Feature Coverage E2E tests for Reelist Elite (Milestone E2E_M2).
You should check existing tests under `tests/` and implement the following test files in `tests/tier1/`:
1. `tests/tier1/auth.test.js`:
   - Test case 1: Successful SignUp with new email
   - Test case 2: Successful SignIn with registered email
   - Test case 3: Get Active Session returns current user payload
   - Test case 4: Successful SignOut invalidates session
   - Test case 5: Check active session returns 401/null post-logout
2. `tests/tier1/watchlist.test.js`:
   - Test case 1: Retrieve empty watchlist on fresh login
   - Test case 2: Add manual movie item to watchlist
   - Test case 3: Retrieve watchlist and confirm manual item is present
   - Test case 4: Delete movie item from watchlist
   - Test case 5: Confirm watchlist is empty after deletion
3. `tests/tier1/import.test.js`:
   - Test case 1: Import a valid Reel URL (using the mock URL `https://www.instagram.com/reel/valid_movie/`)
   - Test case 2: Confirm import endpoint returns decorated movie metadata
   - Test case 3: Verify movie is automatically persisted to watchlist
   - Test case 4: Re-importing same Reel URL is handled gracefully (idempotency or update)
   - Test case 5: Verify import endpoint blocks unauthenticated requests

Important details:
- Use ES Module syntax (e.g. `import` instead of `require`).
- Utilize the cookie-aware `TestClient` from `tests/test-utils.js` for all HTTP requests to interact with Next.js endpoints (e.g. `/api/auth/signup`, `/api/auth/signin`, `/api/auth/session`, `/api/auth/signout`, `/api/watchlist`, `/api/import`).
- Use Node.js's native test runner (`node:test`) and assertions (`node:assert`) or `vitest` assertions if preferred, but keep them compatible.
- Note that the application backend code is in progress and may not be fully running yet, but the test code should be fully syntactically correct, correct logic-wise, and follow standard API behaviors as defined in `PROJECT.md` interface contracts:
  - SignUp/SignIn: POST `/api/auth/signup` and `/api/auth/signin` with `{ email, password }`
  - SignOut: POST `/api/auth/signout`
  - Session: GET `/api/auth/session`
  - Watchlist: GET `/api/watchlist` (returns array of movies), POST `/api/watchlist` with manual movie details, DELETE `/api/watchlist?id=<id>`
  - Import: POST `/api/import` with `{ url: "..." }`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_e2e_m2\handoff.md and reply to this message with a summary and the path to your handoff file.
