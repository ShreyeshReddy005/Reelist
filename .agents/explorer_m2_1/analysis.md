# Milestone M2 Analysis and Implementation Recommendations

This report presents the findings from the workspace audit and details the recommended architecture, file structures, concrete code designs, and testing strategies for Milestone M2 (Local Auth & DB Layer) of Reelist Elite.

---

## 1. Workspace Audit & Current Status

An audit of the project directory `C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite` shows that the project is in its inception phase. 

### Files Observed in Root:
- `PROJECT.md`: Defines the architecture, layout rules, and interface contracts.
- `plan.md`: Details the high-level roadmap of parallel milestones.
- `ORIGINAL_REQUEST.md`: Log of the root orchestrator instructions.
- `.agents/`: Contains metadata and files for active agents (such as `sub_orch_m2`, `explorer_m2_1`, etc.).

**Finding**: There are currently **no** source code folders (`src/`), tests (`tests/`), config files (`package.json`, `tsconfig.json`), or other project files. The implementation of Milestone M2 will establish the initial code structure for the authentication and database libraries.

---

## 2. Auth Interface (`AuthProvider`) under `src/lib/auth/`

To keep auth decoupled and easy to swap (between local offline mock mode and production Supabase mode), we recommend the following file structure:

```
src/lib/auth/
├── types.ts          # Core TS interface definitions (UserSession, AuthProvider)
├── mockProvider.ts   # Local, offline-ready Mock Auth implementation
├── index.ts          # Environment-aware factory/exporter of the AuthProvider
└── auth.test.ts      # Co-located unit and integration tests for Auth
```

### Proposed Interface Contracts (`src/lib/auth/types.ts`)
```typescript
export interface User {
  id: string;
  email: string;
}

export interface UserSession {
  user: User | null;
  token: string | null;
}

export interface AuthProvider {
  signUp(email: string, password: string): Promise<UserSession>;
  signIn(email: string, password: string): Promise<UserSession>;
  signOut(): Promise<void>;
  getSession(): Promise<UserSession>;
}
```

### Exporter logic (`src/lib/auth/index.ts`)
To switch between providers based on environment configuration:
```typescript
import { AuthProvider } from './types';
import { MockAuthProvider } from './mockProvider';
// import { SupabaseAuthProvider } from './supabaseProvider'; // for future use

let authProvider: AuthProvider;

if (process.env.NEXT_PUBLIC_AUTH_MODE === 'supabase') {
  // authProvider = new SupabaseAuthProvider();
  throw new Error("Supabase Auth Provider not implemented yet");
} else {
  authProvider = new MockAuthProvider();
}

export { authProvider };
export * from './types';
```

---

## 3. Mock Auth Implementation and Session Persistence

To allow Next.js App Router (which utilizes both Server Components and Client Components) to share session state, storing the session token in a **cookie** is the optimal strategy. Cookies are automatically transmitted in HTTP requests, making them readable on the server side via Next.js `cookies()` and on the client side via browser APIs or a library like `js-cookie`.

### Mock Session Flow
1. **Sign Up / Sign In**:
   - When a user registers or logs in, verify credentials against the user store (e.g. SQLite database or JSON store).
   - Generate a mock JWT/token (e.g. `mock-jwt-session-id-${userId}`).
   - Set a cookie named `reelist_session` containing the serialized `UserSession`.
2. **Sign Out**:
   - Remove the `reelist_session` cookie.
3. **Get Session**:
   - Read the `reelist_session` cookie. If it exists, parse and return it; otherwise, return a null session.

### Proposed Code for `src/lib/auth/mockProvider.ts`
```typescript
import { AuthProvider, UserSession } from './types';
import { databaseProvider } from '../db';
import crypto from 'crypto';

// Simple cookie helper for client/server agnostic environments
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}

export class MockAuthProvider implements AuthProvider {
  private currentSession: UserSession | null = null;

  async signUp(email: string, password: string): Promise<UserSession> {
    const db = databaseProvider as any;
    if (typeof db.createUser !== 'function') {
      throw new Error("Local database provider does not support user registration");
    }
    
    // Hash password locally using Node's crypto
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;
    
    const userId = crypto.randomUUID();
    await db.createUser(userId, email, passwordHash);
    
    const session: UserSession = {
      user: { id: userId, email },
      token: `mock-token-${userId}-${Date.now()}`
    };
    
    this.currentSession = session;
    setCookie('reelist_session', JSON.stringify(session));
    return session;
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    const db = databaseProvider as any;
    if (typeof db.getUserByEmail !== 'function') {
      throw new Error("Local database provider does not support credentials validation");
    }
    
    const userRecord = await db.getUserByEmail(email);
    if (!userRecord) {
      throw new Error("Invalid email or password");
    }
    
    const [salt, storedHash] = userRecord.passwordHash.split(':');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    
    if (hash !== storedHash) {
      throw new Error("Invalid email or password");
    }
    
    const session: UserSession = {
      user: { id: userRecord.id, email: userRecord.email },
      token: `mock-token-${userRecord.id}-${Date.now()}`
    };
    
    this.currentSession = session;
    setCookie('reelist_session', JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
    deleteCookie('reelist_session');
  }

  async getSession(): Promise<UserSession> {
    if (this.currentSession) return this.currentSession;
    
    // Fallback to cookie check (crucial for page reloads)
    const cookieData = getCookie('reelist_session');
    if (cookieData) {
      try {
        const session = JSON.parse(cookieData) as UserSession;
        this.currentSession = session;
        return session;
      } catch {
        // Invalid cookie format, discard
        deleteCookie('reelist_session');
      }
    }
    
    return { user: null, token: null };
  }
}
```

---

## 4. Database Interface (`DatabaseProvider`) under `src/lib/db/`

To isolate the application logic from the persistence store, we define the following structure under `src/lib/db/`:

```
src/lib/db/
├── types.ts          # Core TS interface definitions (Movie, DatabaseProvider)
├── sqliteProvider.ts # Offline SQLite provider using better-sqlite3
├── jsonProvider.ts   # Offline file-based JSON provider (zero-dependency alternative)
├── index.ts          # DB client factory exporting the active DatabaseProvider
└── db.test.ts        # Co-located unit and integration tests for Database
```

### Proposed Interface Contracts (`src/lib/db/types.ts`)
```typescript
export interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl?: string;
  addedAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export interface DatabaseProvider {
  getWatchlist(userId: string): Promise<Movie[]>;
  addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie>;
  removeMovie(userId: string, movieId: string): Promise<void>;
  
  // Auxiliary functions for local Mock Authentication compatibility
  createUser?(id: string, email: string, passwordHash: string): Promise<void>;
  getUserByEmail?(email: string): Promise<UserRecord | null>;
}
```

---

## 5. Local Database Client Implementations

We present two distinct offline implementations.

### Option A: SQLite Provider (`src/lib/db/sqliteProvider.ts`)
SQLite via `better-sqlite3` is highly performant and mimics structured SQL relations.

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { DatabaseProvider, Movie, UserRecord } from './types';

export class SQLiteDatabaseProvider implements DatabaseProvider {
  private db: Database.Database;

  constructor() {
    // Resolve DB file to a local path in the project workspace
    const dbPath = path.resolve(process.cwd(), '.data/reelist.db');
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_url TEXT,
        rating TEXT,
        source_url TEXT,
        added_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  async getWatchlist(userId: string): Promise<Movie[]> {
    const stmt = this.db.prepare('SELECT id, title, poster_url as posterUrl, rating, source_url as sourceUrl, added_at as addedAt FROM watchlist WHERE user_id = ? ORDER BY added_at DESC');
    return stmt.all(userId) as Movie[];
  }

  async addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie> {
    const id = crypto.randomUUID();
    const addedAt = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO watchlist (id, user_id, title, poster_url, rating, source_url, added_at)
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
    const stmt = this.db.prepare('DELETE FROM watchlist WHERE user_id = ? AND id = ?');
    stmt.run(userId, movieId);
  }

  // Helper auth support methods
  async createUser(id: string, email: string, passwordHash: string): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
    stmt.run(id, email, passwordHash);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const stmt = this.db.prepare('SELECT id, email, password_hash as passwordHash FROM users WHERE email = ?');
    const row = stmt.get(email) as UserRecord | undefined;
    return row || null;
  }
}
```

### Option B: Local JSON File Store (`src/lib/db/jsonProvider.ts`)
This zero-dependency implementation reads and writes to a structured `.json` file. It acts as an elegant fallback in environments where compiling SQLite native C++ binaries (`better-sqlite3`) fails.

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseProvider, Movie, UserRecord } from './types';

interface JSONSchema {
  users: UserRecord[];
  watchlist: (Movie & { userId: string })[];
}

export class JSONDatabaseProvider implements DatabaseProvider {
  private filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), '.data/db.json');
  }

  private async readData(): Promise<JSONSchema> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as JSONSchema;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const initial: JSONSchema = { users: [], watchlist: [] };
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      throw err;
    }
  }

  private async writeData(data: JSONSchema): Promise<void> {
    // Atomic write pattern: write to temporary file, then rename
    const tempPath = `${this.filePath}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }

  async getWatchlist(userId: string): Promise<Movie[]> {
    const data = await this.readData();
    return data.watchlist
      .filter(item => item.userId === userId)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  async addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie> {
    const data = await this.readData();
    const newMovie: Movie & { userId: string } = {
      id: crypto.randomUUID(),
      userId,
      title: movie.title,
      posterUrl: movie.posterUrl,
      rating: movie.rating,
      sourceUrl: movie.sourceUrl,
      addedAt: new Date().toISOString()
    };
    
    data.watchlist.push(newMovie);
    await this.writeData(data);
    
    const { userId: _, ...result } = newMovie;
    return result;
  }

  async removeMovie(userId: string, movieId: string): Promise<void> {
    const data = await this.readData();
    const initialLength = data.watchlist.length;
    data.watchlist = data.watchlist.filter(item => !(item.userId === userId && item.id === movieId));
    if (data.watchlist.length !== initialLength) {
      await this.writeData(data);
    }
  }

  async createUser(id: string, email: string, passwordHash: string): Promise<void> {
    const data = await this.readData();
    if (data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("User already exists");
    }
    data.users.push({ id, email, passwordHash });
    await this.writeData(data);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const data = await this.readData();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }
}
```

---

## 6. Unit and Integration Tests Strategy

### Layout Rule Enforcement
To comply with the project requirement: **"tests co-located"**, the test files for Auth and Database must reside inside their respective directories:
- `src/lib/auth/auth.test.ts`
- `src/lib/db/db.test.ts`

### Recommended Framework: **Vitest**
We highly recommend Vitest for unit and integration testing:
- Native TS support without complex preset compilation configs.
- Extremely fast startup and execution times.
- Out-of-the-box support for Next.js-like environment variables.

### Test Scenarios to Verify:
1. **User Sign Up / Registration**:
   - Succesful registration creates a record and issues a session.
   - Registration with duplicate email throws an error.
2. **User Sign In / Authentication**:
   - Correct credentials return a valid session.
   - Incorrect credentials (wrong email or wrong password) trigger a failure.
3. **Session Persistence**:
   - Invoking `getSession` retrieves active credentials.
   - Calling `signOut` invalidates and clears the session.
4. **Watchlist Operations**:
   - Retrieving an empty user list returns an empty array.
   - `addMovie` correctly pushes a item with a generated ID and timestamp.
   - `getWatchlist` returns records matching the current user and sorted by most recently added.
   - `removeMovie` removes the correct movie and leaves others untouched.

### Example Code: Auth Test Suite (`src/lib/auth/auth.test.ts`)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockAuthProvider } from './mockProvider';

// Mock cookies for test runtime
let cookieStore: Record<string, string> = {};
vi.stubGlobal('document', {
  get cookie() {
    return Object.entries(cookieStore)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ');
  },
  set cookie(val) {
    const [pair] = val.split(';');
    const [k, v] = pair.split('=');
    cookieStore[k.trim()] = decodeURIComponent(v.trim());
  }
});

describe('MockAuthProvider Integration Tests', () => {
  let auth: MockAuthProvider;

  beforeEach(() => {
    cookieStore = {};
    auth = new MockAuthProvider();
  });

  it('should sign up a user successfully and persist session in cookies', async () => {
    const session = await auth.signUp('test@example.com', 'securepass123');
    expect(session.user).not.toBeNull();
    expect(session.user?.email).toBe('test@example.com');
    expect(session.token).toBeTruthy();
    
    // Persistence verification
    const activeSession = await auth.getSession();
    expect(activeSession.user?.email).toBe('test@example.com');
  });

  it('should prevent sign up with duplicate emails', async () => {
    await auth.signUp('dup@example.com', 'pass123');
    await expect(auth.signUp('dup@example.com', 'pass456')).rejects.toThrow();
  });

  it('should authenticate user with valid credentials', async () => {
    await auth.signUp('auth@example.com', 'correctpass');
    
    // Reset cookie/memory state to simulate reload
    cookieStore = {};
    auth = new MockAuthProvider();
    
    const session = await auth.signIn('auth@example.com', 'correctpass');
    expect(session.user?.email).toBe('auth@example.com');
  });

  it('should fail authentication on wrong credentials', async () => {
    await auth.signUp('auth@example.com', 'correctpass');
    await expect(auth.signIn('auth@example.com', 'wrongpass')).rejects.toThrow();
  });

  it('should clear cookies and memory upon sign out', async () => {
    await auth.signUp('logout@example.com', 'pass123');
    await auth.signOut();
    
    const session = await auth.getSession();
    expect(session.user).toBeNull();
    expect(session.token).toBeNull();
  });
});
```

---

## 7. Next Steps & Actionable Roadmap

1. **Setup Package Configs**: Create `package.json` in the root workspace and install dependencies: `better-sqlite3`, `vitest`, `typescript`, `@types/node`.
2. **Implement Core Database Module**:
   - Write `src/lib/db/types.ts`
   - Write `src/lib/db/sqliteProvider.ts` or `src/lib/db/jsonProvider.ts`
   - Write `src/lib/db/index.ts`
   - Write co-located test suite `src/lib/db/db.test.ts`
3. **Implement Core Authentication Module**:
   - Write `src/lib/auth/types.ts`
   - Write `src/lib/auth/mockProvider.ts`
   - Write `src/lib/auth/index.ts`
   - Write co-located test suite `src/lib/auth/auth.test.ts`
4. **Execute Verification**:
   - Run `npx vitest run src/lib/` to verify that both mock modules pass 100% of all unit and integration test scenarios locally.
