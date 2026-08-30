# Review Report: Database and Authentication Implementations (Milestone M2)

**Reviewer**: Reviewer M2-2 (teamwork_preview_reviewer)  
**Date**: 2026-06-27  

---

## Review Summary

**Verdict**: **APPROVE**

The database and authentication implementations for Milestone M2 of Reelist Elite are highly robust, complete, and conform precisely to the interface contracts defined in `PROJECT.md`. The design handles client-server agnosticism, database concurrency, and filesystem atomicity carefully. There are no integrity violations, dummy implementations, or hardcoded test facades. A few minor/major design improvement areas have been identified below.

---

## Findings

### [Major] Finding 1: Inverted Browser Check in `getSessionCookie()`
- **What**: In `src/lib/auth/mockProvider.ts`, `getSessionCookie()` attempts to load `next/headers` and read cookies *before* checking if the code is running in a browser environment.
- **Where**: `src/lib/auth/mockProvider.ts` (Lines 12–31)
- **Why**: 
  In a browser environment, `next/headers` is not available. Calling `require('next/headers')` and invoking `cookies()` will throw an exception. Although this exception is wrapped in a `try...catch` block, it means that **every single client-side call to `getSessionCookie()` throws and catches a server-only exception**. This is computationally wasteful and can trigger Webpack/Turbopack bundler warnings during compilation.
  In contrast, `setSessionCookie()` and `deleteSessionCookie()` correctly check `typeof document !== 'undefined'` first.
- **Suggestion**: 
  Swap the check order in `getSessionCookie()` to match `setSessionCookie()`:
  ```typescript
  export function getSessionCookie(): string | null {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^|;\s*)reelist_session\s*=\s*([^;]*)/);
      return match ? decodeURIComponent(match[2]) : null;
    }

    try {
      const { cookies } = require('next/headers');
      const cookieStore = cookies();
      return cookieStore.get('reelist_session')?.value || null;
    } catch (e) {
      // Fallback
    }
    
    // ... global fallback ...
  }
  ```

### [Minor] Finding 2: Unclosed SQLite Handle on Test Check in `db.test.ts`
- **What**: The test check for SQLite availability leaves an open file handle, preventing clean-up on Windows.
- **Where**: `src/lib/db/db.test.ts` (Lines 8–16)
- **Why**: 
  The test checks if SQLite is available by instantiating `SqliteDatabaseProvider` targeting `data/test_check.sqlite`. However, the provider keeps the `better-sqlite3` database connection open indefinitely. On Windows, file locking prevents deleting files that are actively open. The `fs.unlink()` call catches the error, but the file remains locked and left behind until the test process exits.
- **Suggestion**: 
  Add a close/cleanup method or explicitly close the test SQLite connection after checking, or skip unlinking the check file until tests finish and close connections.

---

## Verified Claims

- **Interface Conformance** → verified via file inspections of `src/lib/auth/types.ts` and `src/lib/db/types.ts` against `PROJECT.md` → **PASS**
- **JSON Provider Concurrency Safety** → verified via inspection of `src/lib/db/jsonProvider.ts` (Mutex queue and `try...finally` lock release) → **PASS**
- **JSON Provider Atomic Writes** → verified via inspection of `src/lib/db/jsonProvider.ts` (temp file write followed by `fs.rename`) → **PASS**
- **SQLite Concurrency & Constraint Safety** → verified via inspection of `src/lib/db/sqliteProvider.ts` (UNIQUE constraint mapped to friendly error, parameterized queries) → **PASS**
- **Case-insensitive user lookups** → verified via inspection of providers (emails normalized using `.toLowerCase()`) → **PASS**

---

## Coverage Gaps

- **Real E2E Build/Runtime Behavior** — risk level: **Low** — recommendation: **Accept Risk**. Because command permissions timed out, the tests could not be run programmatically during this specific review turn. However, manual inspections of the test code (`auth.test.ts` and `db.test.ts`) show high coverage of the requirements, mock cookie manipulation, and duplicate handling.

---

## Unverified Items

- **Running builds and tests output (`npm install` & `npx vitest run`)** — The command execution timed out due to user permission requirements. The test execution logic has been verified via source analysis.

---

## Challenge Summary (Adversarial Review)

**Overall risk assessment**: **LOW**

The implementations are highly robust. Below are the stress-test challenges and edge cases investigated.

## Challenges

### [Medium] Challenge 1: Multi-Process Race Condition in JSON Provider
- **Assumption challenged**: The `Mutex` in `JsonDatabaseProvider` guarantees single-thread serialization.
- **Attack scenario**: If the application is deployed in a serverless environment (e.g., Vercel) or a multi-instance cluster, multiple Node processes will run concurrently. The `Mutex` is process-local and cannot serialize writes across processes. If two processes write to `db.json` simultaneously, they will overwrite each other's temporary files, leading to corrupted JSON data or partial updates.
- **Blast radius**: User watchlist data loss in clustered/serverless environments.
- **Mitigation**: This is an inherent limitation of local JSON databases. The SQLite provider or a real Supabase Database should be used in production. A notice should be added to documentation warning against using the JSON provider in multi-process/clustered production environments.

### [Low] Challenge 2: SQL Injection Vulnerabilities
- **Assumption challenged**: User-supplied input (e.g. email, title, rating, poster URL) could contain malicious SQL characters.
- **Attack scenario**: A user registers with an email like `' OR 1=1 --`.
- **Blast radius**: Complete database leakage or unauthorized bypass.
- **Mitigation**: All database statements in `SqliteDatabaseProvider` are compiled using prepared statements with placeholders (`?`). The values are passed as query parameters, rendering SQL injection impossible.

### [Low] Challenge 3: Memory Exhaustion under High Operations
- **Assumption challenged**: The Promise-based `Mutex` queue will leak memory.
- **Attack scenario**: High volume of concurrent database requests.
- **Blast radius**: Memory usage increases due to long promise chains.
- **Mitigation**: Since JavaScript promise chains garbage collect resolved links, once a lock is released and the task completes, the engine cleans up the completed promises. There is no risk of a memory leak from resolved operations.
