import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JsonDatabaseProvider } from '../../src/lib/db/jsonProvider';
import { SqliteDatabaseProvider } from '../../src/lib/db/sqliteProvider';
import { MockAuthProvider } from '../../src/lib/auth/mockProvider';

const TEST_DIR = path.resolve(process.cwd(), 'data/challenger_test');

async function cleanTestDir() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {}
}

let isSqliteAvailable = false;
try {
  const checkDbPath = path.resolve(process.cwd(), 'data/test_challenger_check.sqlite');
  const provider = new SqliteDatabaseProvider(checkDbPath);
  isSqliteAvailable = true;
  fs.unlink(checkDbPath).catch(() => {});
} catch (e) {
  // SQLite skipped
}

describe('M2 Database & Auth Adversarial Tests', () => {
  beforeEach(async () => {
    await cleanTestDir();
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await cleanTestDir();
  });

  // 1. Concurrency issues in JSON database provider
  describe('JSON Database Provider Concurrency', () => {
    it('should show race conditions / lost updates when multiple instances write concurrently', async () => {
      const dbPath = path.join(TEST_DIR, 'concurrent_db.json');
      // Create two independent instances pointing to the same file
      const db1 = new JsonDatabaseProvider(dbPath);
      const db2 = new JsonDatabaseProvider(dbPath);

      // Perform concurrent writes across the two instances
      const promise1 = db1.addMovie('user-1', { title: 'Movie 1' });
      const promise2 = db2.addMovie('user-1', { title: 'Movie 2' });

      // Run them in parallel
      await Promise.all([promise1, promise2]);

      // Read back watchlist using a fresh instance
      const dbFresh = new JsonDatabaseProvider(dbPath);
      const watchlist = await dbFresh.getWatchlist('user-1');
      const titles = watchlist.map(m => m.title);

      // ASSERTION / EXPECTATION:
      // Due to the lack of inter-instance locking, one of the updates will be lost,
      // meaning titles.length will be 1 instead of 2. We print it to confirm.
      console.log('--- CONCURRENCY TEST RESULT ---');
      console.log('Concurrent watchlist titles:', titles);
      console.log('-------------------------------');

      // We expect the failure to show that it did NOT save both correctly (race condition occurs)
      // For the sake of the test running, we will assert this behavior
      expect(titles.length).not.toBe(2);
    });
  });

  // 2. User Isolation
  describe('User Isolation Verification', () => {
    it('should prevent User B from deleting User A movie', async () => {
      const dbPath = path.join(TEST_DIR, 'isolation_db.json');
      const db = new JsonDatabaseProvider(dbPath);

      // User A adds a movie
      const movieA = await db.addMovie('user-A', { title: 'Inception' });

      // User B tries to delete User A's movie
      await db.removeMovie('user-B', movieA.id);

      // Verify User A still has the movie
      const watchlistA = await db.getWatchlist('user-A');
      expect(watchlistA).toHaveLength(1);
      expect(watchlistA[0].id).toBe(movieA.id);

      // Verify User B's watchlist remains empty
      const watchlistB = await db.getWatchlist('user-B');
      expect(watchlistB).toHaveLength(0);
    });

    if (isSqliteAvailable) {
      it('should prevent User B from deleting User A movie in SQLite', async () => {
        const dbPath = path.join(TEST_DIR, 'isolation_db.sqlite');
        const db = new SqliteDatabaseProvider(dbPath);

        // User A adds a movie
        const movieA = await db.addMovie('user-A', { title: 'Inception' });

        // User B tries to delete User A's movie
        await db.removeMovie('user-B', movieA.id);

        // Verify User A still has the movie
        const watchlistA = await db.getWatchlist('user-A');
        expect(watchlistA).toHaveLength(1);
        expect(watchlistA[0].id).toBe(movieA.id);

        // Verify User B's watchlist remains empty
        const watchlistB = await db.getWatchlist('user-B');
        expect(watchlistB).toHaveLength(0);
      });
    }
  });

  // 3. Exception Safety
  describe('Exception Safety & Corruption', () => {
    it('should throw SyntaxError when JSON file is corrupted and fail on operations', async () => {
      const dbPath = path.join(TEST_DIR, 'corrupted_db.json');
      
      // Write invalid JSON to file
      await fs.writeFile(dbPath, '{ invalid json ... ', 'utf-8');

      const db = new JsonDatabaseProvider(dbPath);
      
      // Try to read/write - it should throw SyntaxError
      await expect(db.getWatchlist('user-1')).rejects.toThrow(SyntaxError);
      await expect(db.addMovie('user-1', { title: 'Test' })).rejects.toThrow(SyntaxError);
    });

    it('should throw SyntaxError when JSON file is empty', async () => {
      const dbPath = path.join(TEST_DIR, 'empty_db.json');
      await fs.writeFile(dbPath, '', 'utf-8'); // empty file

      const db = new JsonDatabaseProvider(dbPath);
      await expect(db.getWatchlist('user-1')).rejects.toThrow(SyntaxError);
    });
  });

  // 4. Edge Cases
  describe('Edge Cases & Data Integrity', () => {
    it('should handle special characters, long titles, and empty strings in movies', async () => {
      const dbPath = path.join(TEST_DIR, 'edge_cases_db.json');
      const db = new JsonDatabaseProvider(dbPath);

      const specialTitle = '🔥 Movie with Emojis & Quotes: "Inception\'s" \\ <script>alert(1)</script>';
      const longTitle = 'A'.repeat(10000);
      const emptyTitle = '';

      const m1 = await db.addMovie('user-1', { title: specialTitle });
      const m2 = await db.addMovie('user-1', { title: longTitle });
      const m3 = await db.addMovie('user-1', { title: emptyTitle });

      const watchlist = await db.getWatchlist('user-1');
      expect(watchlist).toHaveLength(3);
      expect(watchlist.find(m => m.id === m1.id)!.title).toBe(specialTitle);
      expect(watchlist.find(m => m.id === m2.id)!.title).toBe(longTitle);
      expect(watchlist.find(m => m.id === m3.id)!.title).toBe(emptyTitle);
    });

    it('should handle undefined values gracefully at runtime (testing JSON database)', async () => {
      const dbPath = path.join(TEST_DIR, 'missing_db.json');
      const db = new JsonDatabaseProvider(dbPath);

      // Force cast to bypass TypeScript compile checks to simulate JS runtime behavior
      const m = await db.addMovie('user-1', { title: undefined as any, posterUrl: undefined });
      const watchlist = await db.getWatchlist('user-1');
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0].title).toBeUndefined();
    });
  });

  // 5. Session Cookie Manipulation
  describe('Session Cookie Security & Auth Vulnerabilities', () => {
    let db: JsonDatabaseProvider;
    let auth: MockAuthProvider;

    beforeEach(() => {
      db = new JsonDatabaseProvider(path.join(TEST_DIR, 'auth_db.json'));
      auth = new MockAuthProvider(db);
      if (typeof global !== 'undefined') {
        (global as any).__mock_cookies = {};
      }
    });

    afterEach(() => {
      if (typeof global !== 'undefined') {
        delete (global as any).__mock_cookies;
      }
    });

    it('should allow authentication bypass by manipulating the session cookie directly', async () => {
      // Adversary manually crafts a fake session cookie
      const fakeSession = {
        user: { id: 'attacker-uuid', email: 'attacker@example.com' },
        token: 'fake-token-123'
      };

      // Set the session cookie directly to bypass normal signUp/signIn
      if (typeof global !== 'undefined') {
        (global as any).__mock_cookies['reelist_session'] = JSON.stringify(fakeSession);
      }

      // Check session status - it should validate the session successfully!
      const session = await auth.getSession();
      expect(session.user).not.toBeNull();
      expect(session.user!.id).toBe('attacker-uuid');
      expect(session.user!.email).toBe('attacker@example.com');
    });

    it('should allow invalid session types (malformed user fields) to be returned', async () => {
      // Crafter cookie has a number as user ID (which violates interface contract)
      const fakeSession = {
        user: { id: 99999 as any, email: 'number-id@example.com' },
        token: 'token-99999'
      };

      if (typeof global !== 'undefined') {
        (global as any).__mock_cookies['reelist_session'] = JSON.stringify(fakeSession);
      }

      const session = await auth.getSession();
      expect(session.user).not.toBeNull();
      expect(session.user!.id).toBe(99999); // Returned as a number instead of string
    });
  });
});
