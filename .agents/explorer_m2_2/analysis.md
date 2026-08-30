# Milestone M2 Analysis and Implementation Recommendation

## 1. Executive Summary
This document provides the technical analysis and recommendations for implementing **Milestone M2 (Local Database & Authentication Layer)** of the *Reelist Elite* movie watchlist application. 

As observed in our workspace scan, the project is currently in a greenfield, pre-initialization state:
- Top-level files exist: `.agents/` (metadata), `PROJECT.md` (contract interfaces), and `plan.md` (roadmap).
- Source directories (`src/`) and configuration files (`package.json`, `tsconfig.json`) are planned but not yet implemented.

To unblock parallel development, this analysis designs the exact file structures, offline-first implementations (using a robust JSON store and a SQLite client), Next.js App Router integration strategies for session persistence, and a Vitest-based unit/integration testing framework.

---

## 2. Directory & File Structure
We recommend the following file organization under `src/lib/` to comply with the co-location principles in `PROJECT.md`:

```
src/
├── lib/
│   ├── auth/
│   │   ├── types.ts            # Auth interface definitions (UserSession, AuthProvider)
│   │   ├── mockProvider.ts     # Offline mock authentication provider implementation
│   │   ├── index.ts            # Configured export of the active AuthProvider
│   │   └── __tests__/
│   │       └── auth.test.ts    # Unit & Integration tests for Auth
│   └── db/
│       ├── types.ts            # DB interface definitions (Movie, DatabaseProvider)
│       ├── jsonProvider.ts     # Offline JSON file-based database client
│       ├── sqliteProvider.ts   # Offline SQLite database client (better-sqlite3)
│       ├── index.ts            # Configured export of the active DatabaseProvider
│       └── __tests__/
│           └── db.test.ts      # Unit & Integration tests for Database operations
```

---

## 3. Auth Interface & Mock Provider Design

### 3.1 Interface Contracts (`src/lib/auth/types.ts`)
```typescript
export interface UserSession {
  user: { id: string; email: string } | null;
  token: string | null;
}

export interface AuthProvider {
  signUp(email: string, password: string): Promise<UserSession>;
  signIn(email: string, password: string): Promise<UserSession>;
  signOut(): Promise<void>;
  getSession(): Promise<UserSession>;
}
```

### 3.2 Architectural Choice: Session Persistence in Next.js App Router
Since Next.js App Router is a hybrid client/server framework, using standard in-memory storage for mock auth will fail on page refreshes or when transitioning between Client Components and Server Components.
We recommend using **HTTP-Only Cookies** for session persistence:
1. A cookie named `reelist-mock-session` stores a Base64-encoded JSON representation of the `UserSession`.
2. To allow clean client-side and server-side execution, `MockAuthProvider` will read the cookie.
3. In browser environments (client-side), writing/deleting cookies directly via `document.cookie` can be used, or the auth provider calls a thin local API Route Handler (`/api/auth/session`) to set/delete HTTP-only cookies securely on the server.

### 3.3 Mock Auth Provider (`src/lib/auth/mockProvider.ts`)
The mock provider maintains a local registry of users. To run fully offline without DB dependencies, it stores registered credentials in a secure local JSON file (`data/mock_users.json`).

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AuthProvider, UserSession } from './types';

export class MockAuthProvider implements AuthProvider {
  private usersFile: string;

  constructor(usersFile: string = './data/mock_users.json') {
    this.usersFile = path.resolve(usersFile);
  }

  private async loadUsers(): Promise<Record<string, string>> {
    try {
      const data = await fs.readFile(this.usersFile, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  private async saveUsers(users: Record<string, string>): Promise<void> {
    await fs.mkdir(path.dirname(this.usersFile), { recursive: true });
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), 'utf-8');
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private getSessionCookie(): UserSession {
    if (typeof window === 'undefined') {
      // In SSR / Server Components, cookies must be accessed via next/headers
      try {
        const { cookies } = require('next/headers');
        const cookieStore = cookies();
        const value = cookieStore.get('reelist-mock-session')?.value;
        return value ? JSON.parse(Buffer.from(value, 'base64').toString('utf-8')) : { user: null, token: null };
      } catch {
        return { user: null, token: null };
      }
    } else {
      // Client-side execution
      const match = document.cookie.match(/(^|;)\s*reelist-mock-session\s*=\s*([^;]+)/);
      if (match) {
        return JSON.parse(atob(match[2]));
      }
      return { user: null, token: null };
    }
  }

  private setSessionCookie(session: UserSession | null): void {
    const value = session ? btoa(JSON.stringify(session)) : '';
    const maxAge = session ? 60 * 60 * 24 * 7 : 0; // 7 days or delete
    
    if (typeof window === 'undefined') {
      try {
        const { cookies } = require('next/headers');
        const cookieStore = cookies();
        if (session) {
          cookieStore.set('reelist-mock-session', value, { httpOnly: true, maxAge, path: '/' });
        } else {
          cookieStore.delete('reelist-mock-session');
        }
      } catch {
        // Fallback for non-Next server environments
      }
    } else {
      document.cookie = `reelist-mock-session=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }

  async signUp(email: string, password: string): Promise<UserSession> {
    const users = await this.loadUsers();
    const normalizedEmail = email.toLowerCase().trim();
    
    if (users[normalizedEmail]) {
      throw new Error('User already exists');
    }

    const userId = crypto.randomUUID();
    const hashedPassword = this.hashPassword(password);
    
    users[normalizedEmail] = JSON.stringify({ id: userId, passwordHash: hashedPassword });
    await this.saveUsers(users);

    const session: UserSession = {
      user: { id: userId, email: normalizedEmail },
      token: `mock-jwt-${userId}-${Date.now()}`
    };
    this.setSessionCookie(session);
    return session;
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    const users = await this.loadUsers();
    const normalizedEmail = email.toLowerCase().trim();
    
    const userStr = users[normalizedEmail];
    if (!userStr) {
      throw new Error('Invalid email or password');
    }

    const user = JSON.parse(userStr);
    const hashedPassword = this.hashPassword(password);
    
    if (user.passwordHash !== hashedPassword) {
      throw new Error('Invalid email or password');
    }

    const session: UserSession = {
      user: { id: user.id, email: normalizedEmail },
      token: `mock-jwt-${user.id}-${Date.now()}`
    };
    this.setSessionCookie(session);
    return session;
  }

  async signOut(): Promise<void> {
    this.setSessionCookie(null);
  }

  async getSession(): Promise<UserSession> {
    return this.getSessionCookie();
  }
}
```

---

## 4. Database Interface & Local DB Client Design

### 4.1 Interface Contracts (`src/lib/db/types.ts`)
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
  addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie>;
  removeMovie(userId: string, movieId: string): Promise<void>;
}
```

### 4.2 Client Choice 1: Local JSON File Store (Highly Recommended)
To prevent build/compilation issues on Windows machines lacking build tools (node-gyp, C++ toolchains), we propose a thread-safe, atomic local JSON database client using pure Node.js APIs.

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DatabaseProvider, Movie } from './types';

export class JsonDatabaseProvider implements DatabaseProvider {
  private filePath: string;
  private lockPromise: Promise<void> = Promise.resolve();

  constructor(filePath: string = './data/local_db.json') {
    this.filePath = path.resolve(filePath);
  }

  // Atomic file lock to prevent concurrent write corruption
  private async acquireLock(): Promise<() => void> {
    let release: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentLock = this.lockPromise;
    this.lockPromise = nextLock;
    await currentLock;
    return release;
  }

  private async readData(): Promise<{ movies: (Movie & { userId: string })[] }> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { movies: [] };
      }
      throw error;
    }
  }

  private async writeData(data: any): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write atomically via temporary file
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }

  async getWatchlist(userId: string): Promise<Movie[]> {
    const release = await this.acquireLock();
    try {
      const data = await this.readData();
      return data.movies
        .filter(m => m.userId === userId)
        .map(({ userId, ...movie }) => movie);
    } finally {
      release();
    }
  }

  async addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie> {
    const release = await this.acquireLock();
    try {
      const data = await this.readData();
      const newMovie: Movie & { userId: string } = {
        ...movie,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString(),
        userId
      };
      
      data.movies.push(newMovie);
      await this.writeData(data);
      
      const { userId: _, ...result } = newMovie;
      return result;
    } finally {
      release();
    }
  }

  async removeMovie(userId: string, movieId: string): Promise<void> {
    const release = await this.acquireLock();
    try {
      const data = await this.readData();
      const index = data.movies.findIndex(m => m.id === movieId && m.userId === userId);
      if (index === -1) {
        throw new Error('Movie not found or unauthorized');
      }
      data.movies.splice(index, 1);
      await this.writeData(data);
    } finally {
      release();
    }
  }
}
```

### 4.3 Client Choice 2: Local SQLite DB Client (`src/lib/db/sqliteProvider.ts`)
For a more robust relational setup, SQLite using `better-sqlite3` is a fast, synchronous database client.

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { DatabaseProvider, Movie } from './types';

export class SqliteDatabaseProvider implements DatabaseProvider {
  private db: Database.Database;

  constructor(dbPath: string = './data/local_db.sqlite') {
    const resolvedPath = path.resolve(dbPath);
    // Ensure parent directory exists
    const fs = require('fs');
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    
    this.db = new Database(resolvedPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS movies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_url TEXT,
        rating TEXT,
        source_url TEXT,
        added_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);
    `);
  }

  async getWatchlist(userId: string): Promise<Movie[]> {
    const stmt = this.db.prepare('SELECT id, title, poster_url as posterUrl, rating, source_url as sourceUrl, added_at as addedAt FROM movies WHERE user_id = ? ORDER BY added_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows;
  }

  async addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie> {
    const id = crypto.randomUUID();
    const addedAt = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO movies (id, user_id, title, poster_url, rating, source_url, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, movie.title, movie.posterUrl || null, movie.rating || null, movie.sourceUrl || null, addedAt);
    
    return {
      id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      rating: movie.rating,
      sourceUrl: movie.sourceUrl,
      addedAt
    };
  }

  async removeMovie(userId: string, movieId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM movies WHERE id = ? AND user_id = ?');
    const result = stmt.run(movieId, userId);
    if (result.changes === 0) {
      throw new Error('Movie not found or unauthorized');
    }
  }
}
```

---

## 5. Unified Providers Export & Configuration

To make provider switching seamless, we configure `index.ts` files to export the active provider according to environment variables.

### 5.1 Auth Factory Export (`src/lib/auth/index.ts`)
```typescript
import { AuthProvider } from './types';
import { MockAuthProvider } from './mockProvider';

let authProvider: AuthProvider;

// If we integrate Supabase Auth in subsequent milestones:
if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'supabase') {
  // authProvider = new SupabaseAuthProvider();
  throw new Error('Supabase Auth Provider not implemented yet');
} else {
  authProvider = new MockAuthProvider();
}

export { authProvider };
```

### 5.2 Database Factory Export (`src/lib/db/index.ts`)
```typescript
import { DatabaseProvider } from './types';
import { JsonDatabaseProvider } from './jsonProvider';
import { SqliteDatabaseProvider } from './sqliteProvider';

let dbProvider: DatabaseProvider;

const providerType = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'json';

if (providerType === 'sqlite') {
  dbProvider = new SqliteDatabaseProvider();
} else if (providerType === 'supabase') {
  // dbProvider = new SupabaseDatabaseProvider();
  throw new Error('Supabase Database Provider not implemented yet');
} else {
  dbProvider = new JsonDatabaseProvider();
}

export { dbProvider };
```

---

## 6. Unit & Integration Test Strategy

We recommend **Vitest** for testing because of its near-instant execution speed and natural configuration inside Vite/Next.js architectures.

### 6.1 Test Implementation Details

#### Auth Unit Test Cases (`src/lib/auth/__tests__/auth.test.ts`)
- **T1.1 Registration Success**: Create new user, verify session object returned with a valid structure, and verification that user is stored in the mock user file.
- **T1.2 Registration Duplicate**: Attempt to create user with the same email, expect error throw.
- **T1.3 Login Success**: Authenticate with correct password, assert returned session and token.
- **T1.4 Login Failure**: Authenticate with incorrect password or non-existing email, assert failure throw.
- **T1.5 Session Retrieval**: Trigger `getSession()` when cookies are set vs when cookies are absent, verifying correct retrieval.
- **T1.6 Sign Out**: Remove the session, assert that `getSession()` returns empty.

#### Watchlist Database Unit Test Cases (`src/lib/db/__tests__/db.test.ts`)
- **T2.1 Initial State**: Fetch watchlist for a new user, assert array is empty.
- **T2.2 Movie Addition**: Add a movie, verify the return contract has `id`, `addedAt` timestamp, and details match.
- **T2.3 Watchlist Retrieval**: Fetch watchlist after addition, verify length is `1` and item matches.
- **T2.4 Watchlist Deletion**: Delete movie by `id`, verify database state and array is empty again.
- **T2.5 User Isolation**: Verify User A's watchlist does not leak into User B's watchlist, and User A cannot delete User B's movies.

### 6.2 Test Script Setup
Add the following to `package.json` scripts:
```json
"scripts": {
  "test:unit": "vitest run src/lib/auth/__tests__ src/lib/db/__tests__"
}
```

---

## 7. Next Steps & Recommendations
For the Implementer subagent:
1. Ensure `package.json` is set up with Node.js modules: `vitest` (dev dependency) and `better-sqlite3` (if SQLite client is configured).
2. Install standard Node typings `@types/node` for `crypto` and `fs/promises`.
3. Create the directories under `src/lib/auth/` and `src/lib/db/`.
4. Copy the detailed provider files.
5. Create temporary directories `./data/` to host local `.json` and `.sqlite` databases (ensure `./data/*` is added to `.gitignore` to keep user credentials out of repository commits).
