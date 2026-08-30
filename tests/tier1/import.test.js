import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { TestClient, BASE_URL } from '../test-utils.js';

describe('Import Flow E2E Tests', () => {
  const client = new TestClient(BASE_URL);
  const unauthClient = new TestClient(BASE_URL);
  const email = `import_user_${Date.now()}@example.com`;
  const password = 'Password123!';
  const reelUrl = 'https://www.instagram.com/reel/valid_movie/';

  before(async () => {
    // Perform SignUp to establish session before running import tests
    const res = await client.post('/api/auth/signup', { email, password });
    assert.ok(res.ok, `SignUp setup failed with status ${res.status}`);
  });

  it('Import a valid Reel URL', async () => {
    const res = await client.post('/api/import', { url: reelUrl });
    assert.ok(res.ok, `POST /api/import failed with status ${res.status}`);
  });

  it('Confirm import endpoint returns decorated movie metadata', async () => {
    const res = await client.post('/api/import', { url: reelUrl });
    assert.ok(res.ok, `POST /api/import failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(data, 'Response should contain movie metadata');
    assert.strictEqual(data.title, 'Inception', 'Movie title should be Inception');
    assert.ok(data.posterUrl, 'Movie should have a poster URL');
    assert.ok(data.rating, 'Movie should have a rating');
    assert.strictEqual(data.sourceUrl, reelUrl, 'Movie sourceUrl should match the imported Reel URL');
  });

  it('Verify movie is automatically persisted to watchlist', async () => {
    const res = await client.get('/api/watchlist');
    assert.ok(res.ok, `GET /api/watchlist failed with status ${res.status}`);
    const watchlist = await res.json();
    assert.ok(Array.isArray(watchlist), 'Watchlist should be an array');
    
    const importedMovie = watchlist.find((m) => m.sourceUrl === reelUrl);
    assert.ok(importedMovie, 'Watchlist should contain the automatically persisted movie');
    assert.strictEqual(importedMovie.title, 'Inception', 'Persisted movie title should match');
  });

  it('Re-importing same Reel URL is handled gracefully (idempotency or update)', async () => {
    const res = await client.post('/api/import', { url: reelUrl });
    assert.ok(res.ok, `Re-import POST /api/import failed with status ${res.status}`);
    
    const watchlistRes = await client.get('/api/watchlist');
    assert.ok(watchlistRes.ok, `GET /api/watchlist failed with status ${watchlistRes.status}`);
    const watchlist = await watchlistRes.json();
    
    const matchingMovies = watchlist.filter((m) => m.sourceUrl === reelUrl);
    assert.strictEqual(matchingMovies.length, 1, 'Watchlist should contain exactly one entry for this Reel URL (idempotency)');
  });

  it('Verify import endpoint blocks unauthenticated requests', async () => {
    const res = await unauthClient.post('/api/import', { url: reelUrl });
    assert.strictEqual(res.status, 401, 'Unauthenticated request should be blocked with 401');
  });
});
