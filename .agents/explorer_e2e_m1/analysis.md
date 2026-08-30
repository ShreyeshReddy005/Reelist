# E2E Test Suite Design Analysis — Reelist Elite

This document provides the architectural analysis and design recommendations for the E2E Test Suite of Reelist Elite, specifically focusing on Milestone 1 (Test Runner & Fixtures) and detailing Tiers 1-4.

---

## 1. Local/Offline E2E Test Runner Design

### Technology Recommendation
For a greenfield repository with no initial `package.json`, minimizing dependency bloat and installation issues is paramount. We recommend utilizing **Node.js's native test runner (`node:test`)** and assertion library (`node:assert`), introduced in Node v18 and stabilized in v20.

#### Why Node.js Native `node:test`?
1. **Zero External Dependencies**: Runs out of the box with plain Node.js. No npm packages needed.
2. **Speed & Resource Efficiency**: No virtual browser overhead (headless HTTP API-based testing).
3. **Familiar BDD Syntax**: Supports `describe`, `it`, `before/after` lifecycle hooks.
4. **Offline Resilience**: Never requires downloading Chromium, browser binaries, or downloading remote packages.
5. **Native TypeScript Support**: Can be run directly with a TypeScript execution loader like `tsx` (`node --import tsx --test`) or compiled javascript.

---

### Test Runner Orchestration (`tests/runner.js`)
The custom `runner.js` script acts as the E2E lifecycle manager. It handles:
1. **Port Selection & Isolation**: Runs the Next.js server on an isolated port (e.g., `3001`) to avoid conflicts with development servers.
2. **Environment Variable Injection**: Configures the app to run in mock offline mode (`NODE_ENV=test`, `SUPABASE_MOCK=true`, `PIPELINE_MOCK=true`).
3. **Server Spawning & Port Polling**: Starts the Next.js process and polls the health endpoint or login page until it's responsive.
4. **Platform-Safe Executions**: Correctly manages OS differences (e.g., executing `npm.cmd` on Windows vs `npm` on Unix).
5. **Test Selection**: Supports executing specific Tiers or files via CLI arguments.
6. **Graceful Teardown**: Cleans up mock databases and terminates the child process.

#### Proposed `tests/runner.js` Script
```javascript
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_WAIT_MS = 15000;
const POLL_INTERVAL_MS = 250;

// Helper to check if server is up
function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Wait for server to become responsive
async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const isUp = await pingServer();
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Server failed to start on port ${PORT} within ${MAX_WAIT_MS}ms`);
}

async function main() {
  console.log('--- Starting Reelist Elite E2E Test Runner ---');
  
  // Set offline-mock variables
  const env = {
    ...process.env,
    PORT: PORT.toString(),
    NODE_ENV: 'test',
    SUPABASE_MOCK: 'true',
    PIPELINE_MOCK: 'true',
    DATABASE_URL: 'sqlite://test.db' // or JSON database location
  };

  const isWin = process.platform === 'win32';
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  
  console.log(`Starting Next.js server on port ${PORT}...`);
  const serverProcess = spawn(npmCmd, ['run', 'dev', '--', '-p', PORT.toString()], {
    env,
    stdio: 'ignore', // Suppress console noise from dev server
    shell: true
  });

  let exitCode = 0;
  try {
    await waitForServer();
    console.log('Server is responsive. Running E2E tests...');

    // Determine target files based on arguments
    const args = process.argv.slice(2);
    let testPath = 'tests/**/*.test.js';
    
    if (args.includes('--tier1')) testPath = 'tests/tier1/**/*.test.js';
    else if (args.includes('--tier2')) testPath = 'tests/tier2/**/*.test.js';
    else if (args.includes('--tier3')) testPath = 'tests/tier3/**/*.test.js';
    else if (args.includes('--tier4')) testPath = 'tests/tier4/**/*.test.js';

    // Run tests in a subprocess using node --test
    const testProcess = spawn('node', ['--test', testPath], {
      stdio: 'inherit',
      shell: true
    });

    exitCode = await new Promise((resolve) => {
      testProcess.on('close', (code) => resolve(code || 0));
    });
    
  } catch (err) {
    console.error('E2E Test Runner Error:', err.message);
    exitCode = 1;
  } finally {
    console.log('Shutting down Next.js server...');
    serverProcess.kill('SIGINT');
    
    // Clean up SQLite/JSON files
    const dbPath = path.join(__dirname, '..', 'test.db');
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log('Cleaned up test database.');
      } catch (e) {
        console.warn('Could not delete test database file:', e.message);
      }
    }
    
    console.log(`E2E Runner finished with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

main();
```

---

## 2. Directory Layout & Fixture Structure

We recommend organizing the E2E assets strictly inside the `tests/` directory:

```
reelist_elite/
├── tests/
│   ├── fixtures/
│   │   ├── reels/
│   │   │   ├── reel_valid_movie.json
│   │   │   ├── reel_no_caption.json
│   │   │   ├── reel_scraper_fail.json
│   │   │   ├── reel_tmdb_fail.json
│   │   │   └── mapping.js             # Maps URL -> mock JSON file
│   │   ├── auth/
│   │   │   └── users.json             # Seed test credentials
│   │   └── database/
│   │       └── watchlist_seed.json    # Initial DB seed state
│   ├── tier1/                         # Happy-path coverage (>=5 cases per feature)
│   │   ├── auth.test.js
│   │   ├── watchlist.test.js
│   │   └── import.test.js
│   ├── tier2/                         # Boundary & Corner cases (>=5 cases per feature)
│   │   ├── auth.test.js
│   │   ├── watchlist.test.js
│   │   └── import.test.js
│   ├── tier3/                         # Cross-feature states & session interactions
│   │   └── integration.test.js
│   ├── tier4/                         # Bulk workloads and stress tests
│   │   └── workload.test.js
│   ├── test-utils.js                  # Cookie-aware HTTP request helper
│   └── runner.js                      # Custom E2E test runner orchestrator
```

### Mock Reel Mapping (`tests/fixtures/reels/mapping.js`)
To simulate the pipeline offline, both tests and the application backend use a shared URL-to-Mock mapping.
```javascript
const path = require('path');

const reelMapping = {
  "https://www.instagram.com/reel/valid_movie/": path.join(__dirname, "reel_valid_movie.json"),
  "https://www.instagram.com/reel/no_caption/": path.join(__dirname, "reel_no_caption.json"),
  "https://www.instagram.com/reel/scraper_fail/": path.join(__dirname, "reel_scraper_fail.json"),
  "https://www.instagram.com/reel/tmdb_fail/": path.join(__dirname, "reel_tmdb_fail.json")
};

module.exports = reelMapping;
```

### Example Fixture Payload (`reel_valid_movie.json`)
```json
{
  "url": "https://www.instagram.com/reel/valid_movie/",
  "scraped": {
    "status": "success",
    "caption": "OMG! You must watch this mind-bending sci-fi! Inception (2010) is pure genius!"
  },
  "nlp": {
    "status": "success",
    "movieTitle": "Inception",
    "confidence": 0.98
  },
  "tmdb": {
    "status": "success",
    "title": "Inception",
    "posterUrl": "https://image.tmdb.org/t/p/w500/qmDp59hMRjLywccE6wqjD25th5G.jpg",
    "rating": "8.8"
  }
}
```

---

## 3. HTTP/API Testing Mechanism (Opaque-Box Testing)

Since Next.js routes authenticate and process data via HTTP requests, our runner can perform **browser-free E2E tests** by simulating the client's HTTP calls using standard Node.js `fetch`.

### Cookie-Aware HTTP Test Client (`tests/test-utils.js`)
To maintain user sessions between API requests (e.g., signing in, getting session, adding a movie), the tests need to track cookie state. We provide a clean helper class:

```javascript
class TestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    options.headers = options.headers || {};
    
    // Inject cookies
    const cookieString = Object.entries(this.cookies)
      .map(([name, val]) => `${name}=${val}`)
      .join('; ');
    if (cookieString) {
      options.headers['Cookie'] = cookieString;
    }

    const res = await fetch(url, options);

    // Capture cookies from Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Basic cookie parser (takes first key-val pair)
      const parts = setCookie.split(';');
      const [name, val] = parts[0].split('=');
      this.cookies[name.trim()] = val.trim();
    }

    return res;
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  async post(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  }

  async delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

module.exports = { TestClient, BASE_URL: `http://localhost:${process.env.PORT || 3001}` };
```

---

### Component Testing Flow

```
+-------------+         /api/auth/signin         +----------------+
|             | -------------------------------> |                |
|             |          (Sets Cookies)          |                |
|             |                                  |                |
|             |         /api/import (URL)        |    Next.js     |
| E2E Test    | -------------------------------> |   Application  |
| Client      |                                  |   (Local Dev)  |
|             |        /api/watchlist            |                |
|             | <------------------------------- |                |
|             |    (Verify updated watchlist)    |                |
+-------------+                                  +----------------+
```

#### 1. User Auth Testing Flow
1. **SignUp**: Make a `POST /api/auth/signup` with payload `{ email, password }`. Verify status 201 and session body.
2. **SignIn**: Make a `POST /api/auth/signin` with credentials. Verify status 200, session body, and that the `Set-Cookie` header is captured.
3. **Session Verification**: Make a `GET /api/auth/session`. Verify it returns correct user info.
4. **SignOut**: Make a `POST /api/auth/signout`. Verify session is cleared, and subsequent authenticated endpoints return 401.

#### 2. Watchlist DB Testing Flow
1. **List Watchlist**: Make a `GET /api/watchlist`. Verify empty list or seed records.
2. **Add Movie**: Make a `POST /api/watchlist` with payload `{ title, posterUrl, rating, sourceUrl }`. Verify status 201 and record ID.
3. **Validation**: Re-fetch watchlist and verify the movie exists.
4. **Delete Movie**: Make a `DELETE /api/watchlist?id=<id>`. Verify status 200.
5. **Verification**: Re-fetch watchlist and verify it is empty.

#### 3. Pipeline URL Import Testing Flow
1. **Import Reel**: Make a `POST /api/import` with payload `{ url: "https://www.instagram.com/reel/valid_movie/" }`.
2. **Mock Logic in Route Handler**:
   - The backend Route Handler checks `process.env.PIPELINE_MOCK === 'true'`.
   - It reads the mapping matching the requested URL.
   - It simulates the Scraping, NLP, and TMDB stages using the mock payload.
   - It saves the returned movie to the database.
   - It returns the saved movie with a 201 status code.
3. **Validation**: The test client receives the movie payload, then calls `GET /api/watchlist` to confirm the movie was persisted.

---

## 4. Test Tiers Requirements

### Tier 1: Feature Coverage (>= 5 cases each)
*Verify standard happy path execution for all core operations.*
- **Auth**:
  1. Successful SignUp with new email.
  2. Successful SignIn with registered email.
  3. Get Active Session returns current user payload.
  4. Successful SignOut invalidates session.
  5. Check active session returns 401/null post-logout.
- **Watchlist**:
  1. Retrieve empty watchlist on fresh login.
  2. Add manual movie item to watchlist.
  3. Retrieve watchlist and confirm manual item is present.
  4. Delete movie item from watchlist.
  5. Confirm watchlist is empty after deletion.
- **Pipeline URL Import**:
  1. Import a valid Reel URL.
  2. Confirm import endpoint returns decorated movie metadata.
  3. Verify movie is automatically persisted to watchlist.
  4. Re-importing same Reel URL is handled gracefully (idempotency or update).
  5. Verify import endpoint blocks unauthenticated requests.

### Tier 2: Boundary & Corner Cases (>= 5 cases each)
*Verify robust error handling and input validation.*
- **Auth**:
  1. SignUp with malformed email structure (e.g. `invalid-email`).
  2. SignUp with too short/weak password.
  3. SignUp using already registered email.
  4. SignIn with incorrect password.
  5. SignIn with unregistered email.
- **Watchlist**:
  1. Add movie with empty title payload.
  2. Delete movie with non-existent ID.
  3. Attempt watchlist operations with expired/altered session cookie.
  4. Add movie with extremely long title (testing limits).
  5. Attempt to retrieve watchlist of another user (ID tampering).
- **Pipeline URL Import**:
  1. Import non-instagram URL format.
  2. Import Reel URL where scraping fails (simulated scraping error).
  3. Import Reel URL with empty caption (simulated NLP extracting no movie name).
  4. Import Reel URL with movie title that TMDB cannot resolve (should fallback gracefully to placeholder poster and standard rating).
  5. Import Reel URL while pipeline experiences timeout (simulated 504 gateway timeout).

### Tier 3: Cross-Feature State Combinations
*Verify multiple features interacting and state isolation.*
1. **User Data Isolation**: User A adds Movie A. User B logs in, retrieves watchlist, and must NOT see Movie A. User B adds Movie B, and only Movie B is returned for User B.
2. **Post-Logout Persistence**: User A logs in, adds Movie A, logs out. User A logs back in, and Movie A is still present in the watchlist.
3. **Session Switching Pipeline Import**: User A imports Movie A via URL. User A logs out, User B logs in, and User B's watchlist remains empty.
4. **Auth State Guardrails**: Attempt to import a URL, add a movie, or delete a movie when unauthenticated, and confirm all return 401 Unauthorized.
5. **Dynamic Updates**: Import a Reel URL, manual-add a movie, delete the imported movie, and confirm watchlist size changes dynamically from 0 -> 1 -> 2 -> 1.

### Tier 4: Real-World Workloads
*Verify rapid operations, bulk imports, and system resilience.*
1. **Rapid Sequential Imports**: Import 10 mock Reel URLs in sequence to verify queueing/response timing.
2. **Parallel Bulk Imports**: Import 5 Reel URLs concurrently and check that all movies are successfully added without database locking or race conditions.
3. **Rapid Add-Delete-Add**: Add a movie, delete it, and add it again in sub-second intervals to verify database transaction stability.
4. **Large Payload Watchlist**: Seed database with 50+ movies, fetch the watchlist, and assert payload is returned under 200ms.
5. **Multiple Session Interleaving**: Simulating concurrent clients by switching active HTTP clients rapidly to check session leak prevention.
