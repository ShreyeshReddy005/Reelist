# Handoff Report — E2E Test Suite Requirements Analysis (E2E_M1)

## 1. Observation
- We observed the project architecture, layout, and contracts in `PROJECT.md` (lines 17-37, 49-96):
  - Code layout lists: `tests/fixtures/`, `tests/tier1/`...`tests/tier4/`, `tests/runner.js`.
  - Contracts are defined for Auth (`AuthProvider`), Database (`DatabaseProvider`), and Pipeline (`PipelineService`).
  - Milestone M2 will implement Mock Auth and Local DB. Milestone M3 will implement Intelligent Pipeline and Mocks.
- We listed the workspace using `find_by_name` (excluding `.agents`) and found only:
  - `ORIGINAL_REQUEST.md`
  - `PROJECT.md`
  - `plan.md`
  Confirming that the repository is currently in a greenfield state with no `package.json` or source files implemented.

## 2. Logic Chain
- **Step 1 (Zero-Dependency & Offline Constraint)**: The project is greenfield with no dependencies yet. To avoid complex package installs and external internet fetches (especially under offline/code-only constraints), using Node.js's built-in test runner (`node:test`) and assertion library (`node:assert`) is the most robust and lightweight choice.
- **Step 2 (Next.js & API Integration)**: Since Next.js uses App Router endpoints for Auth, Watchlist, and Imports, E2E testing can be performed entirely via HTTP requests (opaque-box API testing). This removes the need for virtual browsers (Puppeteer, Playwright) which require internet connection and heavy installation.
- **Step 3 (Session Management)**: Standard API testing requires maintaining session cookies across requests (e.g., login, then add movie). A simple `TestClient` class utilizing Node's native `fetch` and parsing `Set-Cookie`/`Cookie` headers enables stateless test scripts to behave like authenticated browser users.
- **Step 4 (Offline Pipeline Simulation)**: To test imports without real Instagram scraping or Gemini NLP or TMDB calls, the Route Handlers can check `process.env.PIPELINE_MOCK === 'true'`. The tests can then pass deterministic URLs (e.g. `https://www.instagram.com/reel/valid_movie/`) which the handler resolves against a local JSON-based URL-to-Mock mapping file.

## 3. Caveats
- **Node.js Version**: The design assumes Node.js v18.9.0+ (preferably v20+) is installed on the user's/runner's machine, as native `node:test` and native `fetch` are required.
- **No Browser UI Coverage**: This E2E design focuses on the HTTP API level and application state. Front-end React layout testing is omitted here (scoped to UI components unit tests, while E2E tests the backend workflows, data persistence, and API logic).
- **Endpoint Assumptions**: Assumes the routing paths `/api/auth/signup`, `/api/auth/signin`, `/api/auth/session`, `/api/watchlist`, and `/api/import` will match what is developed in subsequent milestones.

## 4. Conclusion
We recommend:
1. Running E2E tests using a custom `runner.js` script that spawns the Next.js development server on an isolated port, runs native `node:test` tests, and cleans up local test DBs.
2. A structured directory under `tests/` with individual folders for Tiers 1-4, fixtures (reels, auth, db), and test utilities.
3. Using an HTTP client wrapper (`TestClient`) for cookie/session propagation and URL-to-Mock mapping for pipeline simulation.

## 5. Verification Method
Verify by reviewing the design document at:
`C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\explorer_e2e_m1\analysis.md`
Confirm it addresses all three requirements: test runner design, folder and fixture structures, and HTTP-based testing mechanisms.
