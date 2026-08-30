# Milestone M2 Review Report

## PART 1: Quality Review

### Review Summary

**Verdict**: REQUEST_CHANGES

This implementation provides functional JSON and SQLite database providers along with a mock authentication provider that is client/server agnostic. However, we are requesting changes due to several critical security vulnerabilities and interface design issues that must be addressed before this code is considered safe or ready for production-like environments:
1. **Session Tampering Vulnerability**: The mock session cookie contains raw, unsigned JSON. An attacker can edit the cookie to change the user ID and impersonate any user.
2. **XSS Exposure (HttpOnly)**: Cookies are accessible via client-side javascript (no HttpOnly flag), exposing the session tokens to theft.
3. **Weak Hashing**: A simple SHA-256 HMAC with a static hardcoded salt is used for password hashing instead of a secure key-stretching function like bcrypt or argon2.
4. **Interface Leakage**: The `DatabaseProvider` interface was extended with authentication-specific methods (`createUser`, `getUserByEmail`), which leaks concerns and will force future production providers (e.g. Supabase DB) to implement mock-specific auth store functions.

---

### Findings

#### [Critical] Finding 1: Session Tampering via Unsigned Cookie Payload
- **What**: The session cookie stores a raw, unencrypted JSON string of the user session.
- **Where**: `src/lib/auth/mockProvider.ts` (lines 108, 132, 146)
- **Why**: There is no cryptographic signing or encryption on the session cookie. In `getSession`, the code simply parses the raw string from the cookie and extracts the user ID:
  ```typescript
  const session = JSON.parse(rawSession) as UserSession;
  if (session && session.user && session.user.id) { ... }
  ```
  This allows anyone to forge sessions or impersonate other users simply by changing the `id` field in their browser cookies.
- **Suggestion**: Use a signed cookie or store sessions in-memory/database and only store a cryptographically secure session ID in the cookie.

#### [Critical] Finding 2: Session Cookie Exposed to client-side scripts (No HttpOnly flag)
- **What**: The session cookie does not have the `HttpOnly` flag set, enabling client-side JS read/write.
- **Where**: `src/lib/auth/mockProvider.ts` (lines 37, 44)
- **Why**: In `setSessionCookie`, the browser client implementation writes cookies directly via `document.cookie` (which is readable by any running JS). Additionally, the server-side Next.js cookie writer does not enable `httpOnly: true`. This makes the session cookies highly vulnerable to theft via Cross-Site Scripting (XSS).
- **Suggestion**: Restrict session cookie setting and reading to the server side (via API endpoints, Server Actions, or Route Handlers) and ensure the `httpOnly: true` and `secure: true` (in production) flags are set.

#### [Major] Finding 3: Leaking Auth Store Logic into Database Interface
- **What**: Authentication persistence methods are mixed into the general movie database interface contract.
- **Where**: `src/lib/db/types.ts` (lines 22-23)
- **Why**: The `DatabaseProvider` interface was modified from the `PROJECT.md` specification to include `createUser` and `getUserByEmail`. While necessary for the local mock auth provider to store credentials, this design pollutes the movie database interface. Future database providers (e.g., Supabase Database Provider) will be forced to implement these user creation helpers, even though Supabase Auth is handled externally.
- **Suggestion**: Separate user database operations into a distinct interface (e.g., `UserStore`) or use declaration merging/subtyping for the local testing database provider.

#### [Major] Finding 4: Weak Cryptographic Hashing for Passwords
- **What**: Simple SHA-256 HMAC with a static hardcoded salt is used for password hashing.
- **Where**: `src/lib/auth/mockProvider.ts` (lines 6-9)
- **Why**: SHA-256 is designed to be fast and is highly vulnerable to GPU-accelerated dictionary attacks and rainbow tables. A hardcoded salt (`'reelist_mock_salt'`) further weakens security if database records are leaked.
- **Suggestion**: Even for local fallback implementations, use a standard slow key-stretching hashing algorithm like `bcrypt` or `argon2`, or leverage Node's built-in `crypto.scrypt`.

#### [Minor] Finding 5: Potential Next.js Runtime Exception on Cookie Modification
- **What**: Setting or deleting cookies directly from Server Components will cause Next.js runtime crashes.
- **Where**: `src/lib/auth/mockProvider.ts` (lines 41-52, 68-75)
- **Why**: Next.js throws an error if `cookies().set()` or `cookies().delete()` is invoked during the rendering of a Server Component. If `signUp`, `signIn`, or `signOut` are triggered in a server rendering path rather than a Server Action or Route Handler, it will crash.
- **Suggestion**: Document that auth modification actions must only be called from client components (using standard fetch/actions) or server-side actions/route handlers.

---

### Verified Claims

- **JSON DB Mutex Concurrency** → verified via static review → **PASS** (The queue-chaining promise mechanism effectively blocks concurrent operations within the same process thread).
- **JSON DB Atomic Writes** → verified via static review → **PASS** (Writes to `${filePath}.tmp` first, then uses `fs.rename` which is atomic on the same volume).
- **SQLite Parameterized Queries** → verified via static review → **PASS** (All database operations use placeholder binding (`?`) with prepared statements).

---

### Coverage Gaps

- **SQLite concurrent access performance** — risk level: **Medium** — recommendation: evaluate performance and consider enabling WAL (Write-Ahead Logging) mode using `PRAGMA journal_mode = WAL;` in `SqliteDatabaseProvider.init()` to prevent database locking during concurrent reads/writes.
- **SQLite integration with MockAuthProvider** — risk level: **Medium** — recommendation: write integration tests in `auth.test.ts` using the SQLite provider in addition to the JSON provider.

---

### Unverified Items

- **Running Tests (`npm install` & `npx vitest run`)** — reason: Terminal commands timed out waiting for permission prompts. Tests could not be executed dynamically in this turn.

---
---

## PART 2: Adversarial Review (Critic)

### Challenge Summary

**Overall risk assessment**: HIGH

The primary risk lies in session security and process boundary assumptions. If the mock auth/database provider is enabled in a production/staging environment as an offline fallback or demo mode, it presents critical vulnerabilities:
1. Trivial impersonation via session cookie tempering (IDOR).
2. XSS token leakage.
3. Lack of multi-process safety in the JSON DB provider.

---

### Challenges

#### [Critical] Challenge 1: Identity Theft via Cookie Tampering
- **Assumption challenged**: The system assumes session cookie contents are read-only and trustworthy.
- **Attack scenario**: An attacker registers a standard user account. They inspect their local cookies, see the raw JSON string `{"user":{"id":"attacker-uuid","email":"attacker@example.com"},"token":"..."}`, edit the cookie via browser tools to change the `id` to `"admin-uuid"`, and refresh the page. The server processes the request, loads the cookie, and assumes the user is now the administrator.
- **Blast radius**: Complete compromise of any user account, including privilege escalation to admin status.
- **Mitigation**: Sign the session cookies using a cryptographic secret (e.g., HMAC-SHA256 signature appended to the session cookie, or using JWTs signed by a server-side secret).

#### [High] Challenge 2: Cross-Process Data Loss in JSON Database
- **Assumption challenged**: The custom `Mutex` ensures database thread safety.
- **Attack scenario**: In a multi-process environment (e.g. Next.js clustered deployment, Vercel Serverless, PM2), two concurrent requests hit different server processes. Both processes read the same `db.json` file at the same time. Process A adds a movie. Process B adds another movie. Both write back to the file. The process that writes last will silently overwrite the changes made by the other process, leading to permanent data loss.
- **Blast radius**: Silent data corruption and database loss in production or staging environments.
- **Mitigation**: Implement file-level advisory locking (using `flock` or a package like `proper-lockfile`) rather than process-local JS mutex queues.

#### [Medium] Challenge 3: Disk Space Exhaustion on Atomic Writes
- **Assumption challenged**: Writing to temporary files is clean and safe.
- **Attack scenario**: If a write process is interrupted (e.g., system crash, process killed, out of memory) between `fs.writeFile(tempPath)` and `fs.rename(tempPath, filePath)`, the `.tmp` files will accumulate on disk. Over time, these files can exhaust storage space.
- **Blast radius**: Local disk space exhaustion leading to application crash.
- **Mitigation**: Add a cleanup routine on initialization that removes any lingering `.tmp` files in the data directory.
