# Scope: Milestone M2 — Local Database & Authentication Layer

## Objectives
- Implement the authentication wrapper interface (`AuthProvider`) under `src/lib/auth/`.
- Provide a robust local mock authentication provider (persisted session stored in cookies/localStorage or temporary memory) to run offline.
- Implement the database wrapper interface (`DatabaseProvider`) under `src/lib/db/`.
- Develop a local database client (e.g. SQLite using `better-sqlite3` or a clean local JSON file store) that acts as the offline database provider.
- Implement basic unit/integration tests to verify registration, login, session persistence, and database operations (adding/retrieving movies in watchlist).

## Dependencies
- none

## Interfaces
- Auth Interface (`src/lib/auth/`)
- Database Interface (`src/lib/db/`)

## Status
- IN_PROGRESS (Conv: af822060-6ebd-4553-b631-f7b2de3e248d)
