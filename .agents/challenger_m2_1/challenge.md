## Challenge Summary

**Overall risk assessment**: CRITICAL

The database and authentication layers contain critical vulnerabilities, specifically in the mock authentication provider (which permits trivial authentication bypass and privilege escalation) and the JSON database provider (which has severe concurrency race conditions under multi-process or multi-instance scenarios).

---

## Challenges

### [Critical] Challenge 1: Lack of Cryptographic Verification in Session Cookies (Session Cookie Manipulation)

- **Assumption challenged**: The server can safely trust the session details directly read from the `reelist_session` cookie without verifying its integrity.
- **Attack scenario**: The mock session cookie is written as a raw JSON string containing the user ID and email. An attacker can easily modify their browser cookies or manually forge a request headers cookie:
  `reelist_session={"user":{"id":"victim-user-uuid","email":"victim@example.com"},"token":"forged-token"}`
  When the server calls `MockAuthProvider.getSession()`, it uses `JSON.parse` to parse this cookie and immediately trusts the returned user ID. No secret key verification or database session checks are performed.
- **Blast radius**: Complete authentication bypass and privilege escalation. Any attacker can impersonate any victim user simply by knowing or guessing their email/ID.
- **Mitigation**: Sign or encrypt session cookies using a server-side secret key (e.g. using JSON Web Tokens (JWT) or signed cookies), or map sessions to a server-side session database table.

---

### [High] Challenge 2: JSON Database Provider Concurrency Race Condition (Lost Updates & File Corruption)

- **Assumption challenged**: The in-memory `Mutex` in `JsonDatabaseProvider` prevents concurrent write conflicts.
- **Attack scenario**: 
  1. Next.js runs multiple worker processes or instantiates multiple `JsonDatabaseProvider` objects across API routes.
  2. Because the Mutex is instanced-based (`private mutex = new Mutex()`), concurrent processes or separate instances do not share the lock.
  3. When two concurrent requests write to the database, they will read the file state, edit it in memory, write it to the *same* temporary file `${this.filePath}.tmp`, and then rename it to `db.json`.
  4. The writes will collide, corrupting the temporary file or overwriting each other, leading to silent data loss.
- **Blast radius**: Watchlist items and newly created user records will be lost under concurrent workloads. File write conflicts will lead to server crashes or corrupted JSON database files.
- **Mitigation**: 
  - Use unique temporary filenames containing random UUIDs: `const tempPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;`
  - Implement inter-process file locking (e.g., using `proper-lockfile`) to coordinate writes across separate processes.

---

### [Medium] Challenge 3: Prototype Pollution / Denial of Service via Special User IDs

- **Assumption challenged**: The database provider can safely store watchlist lists keyed directly by any user ID.
- **Attack scenario**: A malicious user sends a request with `userId = "__proto__"` or `userId = "toString"`. In `JsonDatabaseProvider`:
  - `db.watchlists['__proto__']` resolves to `Object.prototype`.
  - When the provider runs `db.watchlists[userId].push(newMovie)`, it throws `TypeError: db.watchlists[userId].push is not a function` because `Object.prototype` does not have a `.push` method.
  - This crashes the database query and returns a 500 error or crashes the request handler.
- **Blast radius**: Denial of Service (DoS) for all operations using those keys, potential server crashes.
- **Mitigation**: Sanitize `userId` inputs to reject prototype keys, and initialize database objects using a null-prototype object: `Object.create(null)`.

---

### [Medium] Challenge 4: Absence of Server-Side Session Expiration

- **Assumption challenged**: Client-side cookie expiration is sufficient to expire user sessions.
- **Attack scenario**: While the cookie is set with a 7-day browser lifespan, the server-side code does not validate the age of the session token. If an attacker extracts a cookie and stores it, or if they generate a session cookie with a token from 5 years ago, `getSession()` will accept it as valid indefinitely.
- **Blast radius**: Indefinite session lifetimes and session hijacking persistence.
- **Mitigation**: Store an expiration timestamp in the token (e.g. JWT `exp` claim) and verify that the session has not expired on the server.

---

### [Medium] Challenge 5: Lack of Input Sanitization and Schema Validation

- **Assumption challenged**: The database provider can store any movie properties provided by the application layer.
- **Attack scenario**: 
  - An attacker sends a watchlist entry where `title` is missing/undefined. In `SqliteDatabaseProvider`, this triggers a database constraint error: `SqliteError: NOT NULL constraint failed: movies.title`, causing uncaught application exceptions. In `JsonDatabaseProvider`, undefined fields serialize to dropped keys, causing UI crashes when read back.
  - An attacker sends an extremely long title (e.g., 10MB string) or HTML tags (e.g., `<script>alert(1)</script>`).
- **Blast radius**: Uncaught crashes, Stored XSS vulnerability in client rendering.
- **Mitigation**: Validate input schemas at the provider boundary and verify that required strings are present and sanitized.

---

### [Low] Challenge 6: Inability to Recover from Database File Corruption

- **Assumption challenged**: Database files are never corrupted.
- **Attack scenario**: A crash during writes results in `db.json` becoming invalid JSON. Future reads throw a `SyntaxError` which permanently disables all database actions.
- **Blast radius**: Complete system denial of service.
- **Mitigation**: Catch parsing errors in `readDb()`, rename the corrupt file to a backup, and initialize a fresh empty database state automatically.

---

## Stress Test Results

- **Multiple instances writing to the same JSON file** → Mutex lock is bypassed → Concurrent writes overwrite each other's data → **FAIL**
- **Single instance concurrent writes** → Handled by in-memory Mutex → Serialized write operations succeed → **PASS**
- **Cookie hijacking using forged JSON payload** → Server parses the cookie and returns authenticated session without verification → Authentication Bypassed → **FAIL**
- **Infinite session lifetime / Expired cookies** → Server parses cookie with timestamp from 5 years ago and validates it → Expired session accepted → **FAIL**
- **User isolation checks (User B deleting User A's movie)** → DB filters watchlist array by query userId → User A's movie remains intact → **PASS**
- **Prototype pollution input (`__proto__`)** → Resolves to built-in prototype objects → Throws uncaught type errors (`.push` or `.filter` is not a function) → **FAIL**
- **Missing movie fields in SQLite** → Triggers NOT NULL database constraint → Uncaught SQLite database exception thrown → **FAIL**

---

## Unchallenged Areas

- **Apify scraper pipeline** — Out of scope for Milestone M2 database/auth review.
- **Gemini NLP extraction module** — Out of scope for Milestone M2 database/auth review.
- **Supabase Integration** — Supabase Auth and Database production providers were not reviewed as the local mock auth and file/sqlite providers are the target of current Milestone M2 offline validation.
