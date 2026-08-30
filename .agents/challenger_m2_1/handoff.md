# Handoff Report - Challenger M2-1

## 1. Observation

During the adversarial correctness and robustness review of the Milestone M2 database and auth layer, the following direct observations were made:

### A. Authentication Cookie Parsing (`src/lib/auth/mockProvider.ts`, lines 140-155)
```typescript
  async getSession(): Promise<UserSession> {
    const rawSession = getSessionCookie();
    if (!rawSession) {
      return { user: null, token: null };
    }
    try {
      const session = JSON.parse(rawSession) as UserSession;
      if (session && session.user && session.user.id) {
        return session;
      }
      return { user: null, token: null };
    } catch {
      return { user: null, token: null };
    }
  }
```
The cookie `reelist_session` is parsed as a raw JSON string and its fields are trusted directly without cryptographic verification or signature checking.

### B. Database Writes in `JsonDatabaseProvider` (`src/lib/db/jsonProvider.ts`, lines 46-52)
```typescript
  private async writeDb(data: JsonDbSchema): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }
```
All write calls write to the exact same temporary path (`${this.filePath}.tmp`) before renaming, which is subject to process conflicts if multiple instances run concurrently.

### C. Watchlist Querying/Filtering (`src/lib/db/jsonProvider.ts`, lines 90-93)
```typescript
      if (db.watchlists[userId]) {
        db.watchlists[userId] = db.watchlists[userId].filter(m => m.id !== movieId);
        await this.writeDb(db);
      }
```
The dictionary keys are accessed directly via `userId`. Passing prototype keys (like `__proto__`) resolves to built-in objects, resulting in runtime failures when invoking array methods like `.filter` or `.push`.

### D. SQLite Missing Values Constraint (`src/lib/db/sqliteProvider.ts`, lines 70-74)
```typescript
    const stmt = this.db.prepare(`
      INSERT INTO movies (id, userId, title, posterUrl, rating, sourceUrl, addedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, movie.title, movie.posterUrl || null, movie.rating || null, movie.sourceUrl || null, addedAt);
```
The schema declares `title TEXT NOT NULL`. Inserting an undefined `title` triggers an unhandled `NOT NULL constraint failed: movies.title` error.

---

## 2. Logic Chain

1. **Session Cookie Security**: Observation A shows that `getSession` parses the cookie value directly via `JSON.parse` and returns the session payload. Since there is no signature/hash verification on the cookie, an attacker can modify the cookie string in their browser or request header (e.g. `reelist_session={"user":{"id":"victim-id"}}`). The server will accept this as a valid authenticated session. This leads to **Critical Authentication Bypass**.
2. **Concurrency Race Conditions**: Observation B shows that a static temporary path (`${this.filePath}.tmp`) is used. If two separate provider instances or serverless instances try to write simultaneously, they will both write to this exact path. One process's write will overwrite the other's before rename occurs, leading to **Silent Data Loss**.
3. **Prototype Pollution**: Observation C shows that `db.watchlists` accesses keys directly via `userId` without sanitization. If `userId` is `__proto__`, it resolves to `Object.prototype`, which is not an array. Invoking `filter` or `push` on it fails with `TypeError`, causing a **Denial of Service (DoS)**.
4. **Input Validation**: Observation D shows that omitting required fields like `title` in SQLite throws a database-level crash. Since this is uncaught, it causes **Application Server Crashes (500 errors)**.

---

## 3. Caveats

- We were unable to run E2E test commands dynamically (`npm run test` or `npx vitest run`) because the `node_modules` directory was not pre-installed in the workspace, and running `npm install` timed out waiting for user approval.
- We constructed the unit/integration stress tests statically and placed them in `src/lib/db/db-adversarial.test.ts` and `src/lib/auth/auth-adversarial.test.ts` for immediate execution once packages are installed.

---

## 4. Conclusion

The current database and auth layers have critical vulnerability gaps:
- **Authentication Bypass**: Anyone can log in as any user via session cookie manipulation.
- **Race Conditions**: Parallel JSON database updates collide on the temp file.
- **Vulnerabilities / Crashes**: Prototype pollution via `__proto__` and uncaught SQLite constraint exceptions.

To address these:
1. Implement signed session cookies or JWT tokens.
2. Use random temp files and process locks (`proper-lockfile`).
3. Sanitize `userId` inputs to reject prototype keywords.
4. Validate inputs before querying/writing to the database.

---

## 5. Verification Method

To verify these issues:
1. Install project dependencies:
   ```powershell
   npm install
   ```
2. Run the newly created adversarial test suites via Vitest:
   ```powershell
   npx vitest run src/lib/db/db-adversarial.test.ts
   npx vitest run src/lib/auth/auth-adversarial.test.ts
   ```
3. Observe the failures demonstrating the vulnerabilities described.
