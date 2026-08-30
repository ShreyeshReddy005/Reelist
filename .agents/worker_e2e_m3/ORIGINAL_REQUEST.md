## 2026-06-27T14:18:27Z
You are teamwork_preview_worker. Your task is to implement the Tier 2 Boundary & Corner Cases E2E tests for Reelist Elite (Milestone E2E_M3).
You should implement the following test files in `tests/tier2/`:
1. `tests/tier2/auth.test.js`:
   - Test case 1: SignUp with malformed email structure (e.g. `invalid-email`) should return error status (e.g. 400).
   - Test case 2: SignUp with too short/weak password should return error status (e.g. 400).
   - Test case 3: SignUp using already registered email should return error status (e.g. 409 or 400).
   - Test case 4: SignIn with incorrect password should return error status (e.g. 401).
   - Test case 5: SignIn with unregistered email should return error status (e.g. 401 or 404).
2. `tests/tier2/watchlist.test.js`:
   - Test case 1: Add movie with empty title payload should return error status (e.g. 400).
   - Test case 2: Delete movie with non-existent ID should return error status (e.g. 404 or be handled gracefully returning 200/404 depending on design, let's assert either 404 or standard 200).
   - Test case 3: Attempt watchlist operations (list, add, delete) with expired/altered session cookie should return 401.
   - Test case 4: Add movie with extremely long title (e.g., 500+ characters) should be handled (either validated and rejected with 400, or saved properly, let's assert validation error 400 or successful save depending on schema, usually 400 is expected for input validation).
   - Test case 5: Attempt to retrieve watchlist of another user (ID tampering in query params if applicable, or assert that a user only sees their own data and cannot access others' database records via API).
3. `tests/tier2/import.test.js`:
   - Test case 1: Import non-instagram URL format should return error status (e.g. 400).
   - Test case 2: Import Reel URL where scraping fails (using mock URL `https://www.instagram.com/reel/scraper_fail/` which maps to `reel_scraper_fail.json`) should return error status (e.g. 422 or 500).
   - Test case 3: Import Reel URL with empty caption (using mock URL `https://www.instagram.com/reel/no_caption/` which maps to `reel_no_caption.json`) should return error status (e.g. 422 or 400).
   - Test case 4: Import Reel URL with movie title that TMDB cannot resolve (using mock URL `https://www.instagram.com/reel/tmdb_fail/` which maps to `reel_tmdb_fail.json`) should fallback gracefully (e.g. returning 201/200 but with placeholder poster and default/empty rating).
   - Test case 5: Import Reel URL while pipeline experiences timeout (you can use a specific mock URL or headers to trigger, e.g. simulating a 504 gateway timeout or a slow connection mock URL).

Important details:
- Use ES Module syntax (e.g. `import` instead of `require`).
- Utilize the cookie-aware `TestClient` from `tests/test-utils.js` for all HTTP requests to interact with Next.js endpoints.
- Use Node.js's native test runner (`node:test`) and assertions (`node:assert`).
- The test code should be fully syntactically correct, correct logic-wise, and follow standard API error handling responses.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_e2e_m3\handoff.md and reply to this message with a summary and the path to your handoff file.
