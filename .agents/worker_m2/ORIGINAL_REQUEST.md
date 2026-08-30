## 2026-06-27T00:30:03Z

Your working directory is: C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_m2.
Your identity is: Worker M2 (teamwork_preview_worker archetype).

Your task is to implement the local authentication and database layer for Reelist Elite (Milestone M2) following the design recommendations in C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\sub_orch_m2\analysis.md and the interface definitions in PROJECT.md.

Specifically:
1. Initialize the project with `package.json` and `tsconfig.json` at the root if they do not exist. Install necessary dependencies (`vitest`, `better-sqlite3`, `typescript`, `@types/node`, `js-cookie`, `@types/js-cookie` if needed, etc.). Note: make sure to handle errors gracefully if `better-sqlite3` fails to compile due to missing Windows build tools.
2. Create directories:
   - `src/lib/auth`
   - `src/lib/db`
3. Implement Database Provider interface (`src/lib/db/types.ts`):
   - Support `Movie` and `DatabaseProvider` interfaces.
   - Add helpers `createUser(id, email, passwordHash)` and `getUserByEmail(email)` to support Mock Auth Provider.
4. Implement both DB clients:
   - `src/lib/db/jsonProvider.ts`: Pure JSON client using Node's `fs/promises` with atomic writes. This is the default.
   - `src/lib/db/sqliteProvider.ts`: SQLite client using `better-sqlite3`.
5. Implement DB client factory (`src/lib/db/index.ts`) that exports the active database provider based on `process.env.NEXT_PUBLIC_DATABASE_PROVIDER` (defaults to JSON).
6. Implement Auth Provider interface (`src/lib/auth/types.ts`):
   - Support `UserSession` and `AuthProvider` interfaces.
7. Implement Mock Auth Provider (`src/lib/auth/mockProvider.ts`):
   - Authenticate users using password hashing (e.g. using Node's `crypto` module).
   - Read/write the serialized session from/to a cookie named `reelist_session` using a browser/server-agnostic helper (reading `document.cookie` or fallback to Next.js headers if available).
   - Read/write registered users from the active database provider (`dbProvider`) using its helpers.
8. Implement Auth client factory (`src/lib/auth/index.ts`) that exports `MockAuthProvider`.
9. Setup Vitest configuration (`vitest.config.ts` or similar).
10. Implement unit/integration tests co-located under the directories:
    - `src/lib/auth/auth.test.ts`
    - `src/lib/db/db.test.ts`
    Test scenarios must include: registration success/duplicate, login success/failure, session persistence via cookies, watchlist CRUD, and user isolation.
11. Run the test suite and verify that all tests pass.
12. Verify that the output files follow the code layout specified in `PROJECT.md`.
13. Write a detailed handoff report to `C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_m2\handoff.md` including:
    - Verification commands and results (test outputs, build outputs)
    - Code layout compliance check
    - Paths to all created/modified files
14. When finished, send a message to caller conversation ID af822060-6ebd-4553-b631-f7b2de3e248d.

MANDATORY INTEGRITY WARNING — include this verbatim in the Worker's dispatch prompt:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
