# Handoff Report: Milestone M2 Review & Adversarial Stress Testing

## 1. Observation

- **Auth Cookie Handling**: `src/lib/auth/mockProvider.ts`, lines 108 and 132 call `setSessionCookie(JSON.stringify(session))` where `session` is of type `UserSession`.
- **Auth Session Parsing**: `src/lib/auth/mockProvider.ts`, lines 146-147 retrieve and parse the session cookie:
  ```typescript
  const session = JSON.parse(rawSession) as UserSession;
  if (session && session.user && session.user.id) {
    return session;
  }
  ```
- **Cookie Writing Flags**: `src/lib/auth/mockProvider.ts`, line 37 writes the cookie for the document:
  ```typescript
  document.cookie = `reelist_session=${encodeURIComponent(value)};path=/;expires=${expires.toUTCString()};SameSite=Lax`;
  ```
  And lines 44-48 write the cookie server-side using Next.js `cookies()` store:
  ```typescript
  cookieStore.set('reelist_session', value, {
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
    sameSite: 'lax',
  });
  ```
  Neither calls specify `httpOnly: true` or cryptographic signing/encryption.
- **Database Types Interface**: `src/lib/db/types.ts`, lines 22-23:
  ```typescript
  // Helpers for Mock Auth Provider
  createUser(id: string, email: string, passwordHash: string): Promise<DbUser>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  ```
- **Password Hashing**: `src/lib/auth/mockProvider.ts`, lines 6-9:
  ```typescript
  export function hashPassword(password: string): string {
    const salt = 'reelist_mock_salt';
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }
  ```
- **JSON Provider Lock**: `src/lib/db/jsonProvider.ts`, lines 6-19 implements a custom queue-based `Mutex` class that is only stored in memory.
- **Test execution failure**: Proposing `npm install` timed out on permission prompts:
  ```
  Encountered error in step execution: Permission prompt for action 'command' on target 'npm install' timed out waiting for user response.
  ```

---

## 2. Logic Chain

1. **Vulnerability to Session Tampering**:
   - *Observation*: Session cookie stores raw unencrypted JSON of the user session structure (`{ user, token }`).
   - *Observation*: `getSession()` decodes the raw session payload from the cookie without any cryptographic signature or integrity check.
   - *Reasoning*: Because there is no signature or hash verification, an attacker can modify the `id` field in the JSON payload inside their browser cookies (e.g. from `attacker-id` to `admin-id`). When the server reads the cookie via `getSession()`, it will parse the modified JSON and authenticate the client as the target user.
   - *Conclusion*: A severe session tampering (impersonation/privilege escalation) vulnerability is present.

2. **Vulnerability to Session Cookie Theft (XSS)**:
   - *Observation*: Neither the browser-side nor server-side cookie writing code sets the `HttpOnly` flag.
   - *Reasoning*: The `HttpOnly` flag prevents client-side javascript from accessing the cookie via `document.cookie`. Without it, any client-side script running on the page (e.g. from a compromised third-party library or an XSS vulnerability) can access and exfiltrate the raw session token.
   - *Conclusion*: Session cookies are exposed to XSS-based theft.

3. **Weak Hashing Algorithm**:
   - *Observation*: Password hashing utilizes `crypto.createHmac('sha256', 'reelist_mock_salt')`.
   - *Reasoning*: SHA-256 is a fast cryptographic hashing function. For password hashing, fast algorithms are highly vulnerable to offline brute-force attacks via GPU/ASIC if database tables are leaked. Key-stretching algorithms (e.g. bcrypt, scrypt, or argon2) must be used to mitigate this risk.
   - *Conclusion*: Password hashing scheme is insecure.

4. **Interface Leakage**:
   - *Observation*: `DatabaseProvider` includes user management methods `createUser` and `getUserByEmail`.
   - *Reasoning*: The `PROJECT.md` specifies the Database Interface only for managing the `Movie` model. Mixing user credentials management helpers into the general movies database interface couples these two domains and forces any production database provider (e.g. Supabase Database) to implement these user creation helpers or dummy implementations.
   - *Conclusion*: The DB interface has conformance variance and domain coupling issues.

5. **Multi-Process Concurrency Issue**:
   - *Observation*: The JSON database provider relies on an in-memory custom `Mutex` class to lock files.
   - *Reasoning*: An in-memory mutex only locks operations within the current Node.js process thread. In web hosting environments that run multiple concurrent processes (e.g. Next.js multi-threaded clustering or serverless functions like Vercel), concurrent requests will hit separate processes and read/write to `data/db.json` without coordination, leading to silent data overwrites and data corruption.
   - *Conclusion*: JSON provider lacks multi-process concurrency safety.

---

## 3. Caveats

- **No Dynamic Test Execution**: Because `npm install` timed out due to permission prompt timeouts, we could not run `npx vitest run` to verify tests dynamically. The evaluation was conducted using thorough static analysis and code trace.
- **Mock Intention**: The `mockProvider.ts` is explicitly labeled "Mock Auth Provider" for offline testing. However, since the database layers and mock auth will be integrated into the actual Next.js application, these security weaknesses (session tampering, weak hashing, lack of HttpOnly) pose a real threat if local/offline capability is enabled or deployed to production as a fallback.

---

## 4. Conclusion

The authentication and database layers are structurally functional but suffer from major security flaws and interface design leakage. Our final verdict is **REQUEST_CHANGES** (specifically for session tampering, HttpOnly cookie exposure, weak hashing, interface pollution, and process-unsafe locking).

---

## 5. Verification Method

To verify these findings:
1. **Verify Session Tampering**:
   - Inspect `src/lib/auth/mockProvider.ts` to see that `getSessionCookie()` is parsed directly via `JSON.parse` with no cryptographic check.
2. **Verify Missing HttpOnly**:
   - Inspect `setSessionCookie()` in `src/lib/auth/mockProvider.ts` to see that `HttpOnly` flag is not specified.
3. **Verify Tests (if permission prompts are approved)**:
   - Run `npm install`
   - Run `npx vitest run` to verify tests pass under ideal mock environments.
