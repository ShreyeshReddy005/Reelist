# Analysis & Recommendation Report: Milestone M2 - Local Auth & DB Layer
**Author**: Explorer M2-3  
**Date**: 2026-06-27  

## Executive Summary
This report analyzes the Reelist Elite workspace and provides a complete architecture, file structure, code designs, and testing strategy for implementing Milestone M2 (Local Auth & DB Layer). Because the workspace currently contains only configuration and metadata files, we propose the complete directory layout and implementation details for:
1. **Auth Interface and Mock Auth Provider** (`src/lib/auth/`) using cookie-based session persistence.
2. **Database Interface and Offline DB Client** (`src/lib/db/`) comparing SQLite and JSON file store approaches.
3. **Unit/Integration Test Suite** using Vitest to verify register, login, session persistence, and watchlists.

---

## 1. Current Workspace Scan & Verification
A search of the project workspace `C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite` reveals that **no source code, tests, or build configuration files currently exist.**

The project directory consists strictly of the following:
* `/PROJECT.md` — Project definition, architecture, and interface contracts.
* `/plan.md` — Execution roadmap.
* `/.agents/` — Coordination metadata directories for agents (Briefings, Original Requests, Progress tracks).
* `/ORIGINAL_REQUEST.md` — Original agent request.

**Conclusion**: The workspace is a blank slate. Milestone M2 can define its file structure and configurations from scratch under `src/` and `tests/`.

---

## 2. Auth Interface & Mock Auth Provider Design (`src/lib/auth/`)
To support offline development, SSR (Server-Side Rendering), and local client interactions in Next.js, the Auth Layer must be cleanly abstracted.

### 2.1 Proposed Directory Structure
```text
src/lib/auth/
├── types.ts          # Type definitions and interface contracts
├── mockProvider.ts   # Cookie-based offline mock AuthProvider implementation
└── index.ts          # Provider factory (switches between Mock and Supabase)
```

### 2.2 Auth Interface (`src/lib/auth/types.ts`)
This defines the contracts matching `PROJECT.md` exactly:
```typescript
export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  token: string | null;
}

export interface AuthProvider {
  signUp(email: string, password: string): Promise<UserSession>;
  signIn(email: string, password: string): Promise<UserSession>;
  signOut(): Promise<void>;
  getSession(): Promise<UserSession>;
}
```

### 2.3 Mock Auth Implementation (`src/lib/auth/mockProvider.ts`)
To make mock auth work seamlessly with Next.js Server Components and Client Components, it should store the session token in a HTTP-only cookie.
* **Session Persistence**: Set a cookie named `reelist_session` containing a signed or Base64-encoded token (e.g. `mock-jwt-<user-id>`).
* **User Persistence**: To avoid losing registered users on server restarts, the mock auth provider should query the local database's `users` table, or use a simple JSON file store (`mock_users.json`). Storing them in the local SQLite database is the cleanest approach.

```typescript
import { AuthProvider, UserSession } from "./types";
import { dbProvider } from "../db"; // Interacts with local database to verify/register

export class MockAuthProvider implements AuthProvider {
  private getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  }

  private setCookie(name: string, value: string, days = 7) {
    if (typeof document === "undefined") return;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
  }

  private deleteCookie(name: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Lax`;
  }

  async signUp(email: string, password: string): Promise<UserSession> {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Call local database layer to insert user
    const db = (dbProvider as any); // Typecast to access internal sqlite check if needed
    
    // Simulating database user persistence
    const userId = `usr_${Math.random().toString(36).substr(2, 9)}`;
    const token = `mock-token-${userId}`;

    // Store user credentials in DB/mock storage
    // Note: In real SQLite provider, write user. Here we mock:
    await db.saveMockUser(userId, email, password);

    const session: UserSession = {
      user: { id: userId, email },
      token,
    };

    this.setCookie("reelist_session", JSON.stringify(session));
    return session;
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    const db = (dbProvider as any);
    const user = await db.verifyMockUser(email, password);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const token = `mock-token-${user.id}`;
    const session: UserSession = {
      user: { id: user.id, email: user.email },
      token,
    };

    this.setCookie("reelist_session", JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    this.deleteCookie("reelist_session");
  }

  async getSession(): Promise<UserSession> {
    // Read from cookie (works client-side; server-side requires reading headers)
    const sessionStr = this.getCookie("reelist_session");
    if (!sessionStr) {
      return { user: null, token: null };
    }
    try {
      return JSON.parse(sessionStr) as UserSession;
    } catch {
      return { user: null, token: null };
    }
  }
}
```

### 2.4 Provider Factory (`src/lib/auth/index.ts`)
```typescript
import { AuthProvider } from "./types";
import { MockAuthProvider } from "./mockProvider";

let authProvider: AuthProvider;

// Toggle using env vars. Defaults to mock for local offline development.
if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === "supabase") {
  // SupabaseAuthProvider will be loaded here in later milestones
  throw new Error("Supabase Auth Provider not yet implemented");
} else {
  authProvider = new MockAuthProvider();
}

export { authProvider };
```

---

## 3. Database Interface & Local DB Provider Design (`src/lib/db/`)
We compare two approaches for the local database layer: a native SQLite client using `better-sqlite3` and a portable local JSON file store.

### 3.1 Comparison of Local Offline DB Clients
| Feature | SQLite (`better-sqlite3`) | Local JSON File Store |
| :--- | :--- | :--- |
| **SQL Schema Fidelity** | **High**: Supports actual tables, foreign keys, constraints. | **Low**: Requires manual Javascript mapping/filtering. |
| **Performance** | **Very High**: Indexing, concurrent reads, transactional writes. | **Low**: Entire database read/written on every mutation. |
| **Portability** | **Medium**: Requires native binary node-gyp compilation. | **High**: Pure JS, runs in any environment without setup. |
| **Mock Users Integration** | **Clean**: Store users and watchlists in separate related tables. | **Moderate**: Manual file updates. |

**Recommendation**: We recommend **SQLite via `better-sqlite3`** because it mirrors the SQL paradigms of Supabase (Postgres) much closer than a custom JSON parser, ensuring that developers write SQL schemas that align with production expectations.

### 3.2 Proposed Directory Structure
```text
src/lib/db/
├── types.ts          # Movie type and DatabaseProvider interface contract
├── sqliteProvider.ts # better-sqlite3 local client implementation
└── index.ts          # Provider factory (switches between sqlite and Supabase)
```

### 3.3 Database Interface (`src/lib/db/types.ts`)
```typescript
export interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl?: string;
  addedAt: string;
}

export interface DatabaseProvider {
  getWatchlist(userId: string): Promise<Movie[]>;
  addMovie(userId: string, movie: Omit<Movie, "id" | "addedAt">): Promise<Movie>;
  removeMovie(userId: string, movieId: string): Promise<void>;
}
```

### 3.4 SQLite Provider Implementation (`src/lib/db/sqliteProvider.ts`)
```typescript
import Database from "better-sqlite3";
import { DatabaseProvider, Movie } from "./types";
import path from "path";

export class SqliteDatabaseProvider implements DatabaseProvider {
  private db: Database.Database;

  constructor() {
    const dbPath = path.resolve(process.cwd(), "local.db");
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    // Enable WAL mode for concurrency
    this.db.pragma("journal_mode = WAL");
    
    // Create Users Table for Auth mock integration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Watchlist Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_url TEXT,
        rating TEXT,
        source_url TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Helper methods for Mock Auth Provider integration
  async saveMockUser(id: string, email: string, passwordHash: string): Promise<void> {
    const stmt = this.db.prepare(
      "INSERT INTO users (id, email, password) VALUES (?, ?, ?)"
    );
    try {
      stmt.run(id, email, passwordHash);
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new Error("User already exists");
      }
      throw err;
    }
  }

  async verifyMockUser(email: string, passwordHash: string): Promise<{ id: string; email: string } | null> {
    const stmt = this.db.prepare(
      "SELECT id, email FROM users WHERE email = ? AND password = ?"
    );
    const row = stmt.get(email, passwordHash) as { id: string; email: string } | undefined;
    return row || null;
  }

  // DatabaseProvider methods
  async getWatchlist(userId: string): Promise<Movie[]> {
    const stmt = this.db.prepare(
      "SELECT id, title, poster_url as posterUrl, rating, source_url as sourceUrl, added_at as addedAt FROM watchlist WHERE user_id = ? ORDER BY added_at DESC"
    );
    const rows = stmt.all(userId) as Movie[];
    return rows;
  }

  async addMovie(userId: string, movie: Omit<Movie, "id" | "addedAt">): Promise<Movie> {
    const id = `mov_${Math.random().toString(36).substr(2, 9)}`;
    const addedAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO watchlist (id, user_id, title, poster_url, rating, source_url, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      movie.title,
      movie.posterUrl || null,
      movie.rating || null,
      movie.sourceUrl || null,
      addedAt
    );

    return {
      id,
      addedAt,
      ...movie,
    };
  }

  async removeMovie(userId: string, movieId: string): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM watchlist WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(movieId, userId);
    if (result.changes === 0) {
      throw new Error("Movie not found or does not belong to user");
    }
  }
}
```

### 3.5 Provider Factory (`src/lib/db/index.ts`)
```typescript
import { DatabaseProvider } from "./types";
import { SqliteDatabaseProvider } from "./sqliteProvider";

let dbProvider: DatabaseProvider;

if (process.env.NEXT_PUBLIC_DATABASE_PROVIDER === "supabase") {
  // SupabaseDatabaseProvider will be loaded here in later milestones
  throw new Error("Supabase Database Provider not yet implemented");
} else {
  dbProvider = new SqliteDatabaseProvider();
}

export { dbProvider };
```

---

## 4. Unit & Integration Testing Strategy
To achieve high reliability, E2E readiness, and offline stability, a comprehensive suite of unit and integration tests must target `src/lib/auth/` and `src/lib/db/`.

### 4.1 Test Runner & Framework: Vitest
We recommend **Vitest** for the following reasons:
* Native TypeScript support out-of-the-box (no `ts-jest` config pain).
* Very fast in-memory execution, compatible with ESM.
* Drop-in replacement for Jest APIs.

### 4.2 Test File Layout
```text
tests/
├── unit/
│   ├── auth.test.ts      # Authentication tests (signUp, signIn, signOut, sessions)
│   └── db.test.ts        # Database operations tests (CRUD, user isolation)
└── setup.ts              # Global test setup (e.g. database cleanups)
```

### 4.3 Test Cleanup & Isolation
A key issue with offline databases is test-case contamination. We recommend using a temporary test database (e.g. `test.db`) during tests, and clearing tables in a `beforeEach` or `afterEach` hook.

Example global test setup:
```typescript
// tests/setup.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Force test environment DB
process.env.DATABASE_URL = "test.db";

afterAll(() => {
  // Clean up test database file
  const testDbFile = path.resolve(process.cwd(), "test.db");
  const walFile = path.resolve(process.cwd(), "test.db-wal");
  const shmFile = path.resolve(process.cwd(), "test.db-shm");
  
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
  if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
});
```

### 4.4 Test Scenarios to Verify
#### 1. Authentication (`tests/unit/auth.test.ts`)
* **Registration**: 
  - `signUp` with a new email returns user session with a valid user ID.
  - `signUp` with duplicate email throws an appropriate error.
* **Login**:
  - `signIn` with correct credentials returns user session.
  - `signIn` with invalid credentials throws "Invalid email or password" error.
* **Sign Out**:
  - `signOut` clears the local session cookies.
  - Subsequent `getSession` calls return `{ user: null, token: null }`.
* **Session Persistence**:
  - Setting a valid session cookie allows `getSession` to resolve user details correctly.

#### 2. Database (`tests/unit/db.test.ts`)
* **Watchlist Insertion**:
  - `addMovie` correctly inserts a movie row and returns the inserted movie with a generated UUID/ID and `addedAt` timestamp.
* **Watchlist Retrieval**:
  - `getWatchlist` retrieves all movies associated with a `userId` sorted by date descending.
* **Watchlist Deletion**:
  - `removeMovie` deletes the specified movie only if it belongs to the active `userId`.
  - Deleting a non-existent movie ID or a movie belonging to a different user throws an error.
* **User Watchlist Isolation**:
  - User A adds Movie 1, User B adds Movie 2.
  - User A's watchlist must not contain Movie 2, and vice versa.

---

## 5. Next Steps & Worker Checklist
For the Worker agent assigned to write this milestone:
1. Initialize the node project workspace (create `package.json`, install `better-sqlite3`, `vitest`, `typescript`, `@types/node` and Next.js dependencies).
2. Create directories `src/lib/auth`, `src/lib/db`, `tests/unit`.
3. Write `src/lib/auth/types.ts` and `src/lib/db/types.ts`.
4. Implement `src/lib/db/sqliteProvider.ts` with schema auto-creation.
5. Implement `src/lib/auth/mockProvider.ts` and wire it up with the SQLite db.
6. Set up Vitest config `vitest.config.ts`.
7. Write and run tests to verify 100% functionality offline.
