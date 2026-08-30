# Synthesized Analysis & Recommendation: Milestone M2

## Consensus
- **Project State**: Workspace is currently greenfield (empty, only `.agents`, `PROJECT.md`, `plan.md`). No `src/` directory, `tests/` directory, or `package.json` exists.
- **Initialization**: Need to create `package.json` and install devDependencies/dependencies: `vitest` (for testing), `better-sqlite3` (for sqlite), `typescript`, `@types/node`.
- **Database Layer**:
  - Implement interface `DatabaseProvider` under `src/lib/db/types.ts` matching `PROJECT.md`.
  - Implement two clients:
    1. `sqliteProvider.ts`: SQLite client using `better-sqlite3` (relational database parity with future Supabase).
    2. `jsonProvider.ts`: Pure JSON client using Node's `fs/promises` (robust, zero C++ native compiling dependency, fallback if SQLite installation fails on Windows).
  - Export active provider via `src/lib/db/index.ts` using environment variable `NEXT_PUBLIC_DATABASE_PROVIDER` (defaults to `json` for ease of setup, switches to `sqlite`).
- **Auth Layer**:
  - Implement interface `AuthProvider` under `src/lib/auth/types.ts` matching `PROJECT.md`.
  - Implement `mockProvider.ts` storing session state in cookies (`reelist_session`) to support Next.js App Router Server/Client Components.
  - Persist credentials either in the SQLite database (`users` table) or in a dedicated JSON file (e.g. `data/mock_users.json`) to survive restarts.
- **Testing**:
  - Use `vitest` for unit and integration testing.
  - Co-locate tests: `src/lib/auth/auth.test.ts` and `src/lib/db/db.test.ts`.
  - Cover scenarios: registration success/duplicate, login success/failure, session cookie management, watchlist CRUD, and user isolation.

## Resolved Conflicts / Decision
- **Database Client Choice**: We will implement *both* JSON file database and SQLite database. The JSON provider will be the default fallback to guarantee out-of-the-box execution on any machine, and the SQLite provider will be available when `NEXT_PUBLIC_DATABASE_PROVIDER=sqlite`.
- **User Persistence**: The `MockAuthProvider` will persist registered users to whichever database is active (via database helper methods `createUser` and `getUserByEmail`) to ensure credentials persistence.
