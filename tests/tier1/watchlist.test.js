import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { TestClient, BASE_URL } from '../test-utils.js';

describe('Watchlist Flow E2E Tests', () => {
  const client = new TestClient(BASE_URL);
  const email = `watchlist_user_${Date.now()}@example.com`;
  const password = 'Password123!';
  let createdMovieId = null;

  const movieDetails = {
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QvHw1tbvupC6YhxpAl6vbzV.jpg',
    rating: '8.6',
    sourceUrl: 'https://www.instagram.com/reel/valid_movie/'
  };

  before(async () => {
    // Perform SignUp to establish session before running watchlist tests
    const res = await client.post('/api/auth/signup', { email, password });
    assert.ok(res.ok, `SignUp setup failed with status ${res.status}`);
  });

  it('Retrieve empty watchlist on fresh login', async () => {
    const res = await client.get('/api/watchlist');
    assert.ok(res.ok, `GET /api/watchlist failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Watchlist should be an array');
    assert.strictEqual(data.length, 0, 'Watchlist should be empty initially');
  });

  it('Add manual movie item to watchlist', async () => {
    const res = await client.post('/api/watchlist', movieDetails);
    assert.ok(res.ok, `POST /api/watchlist failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(data && data.id, 'Created movie should have an ID');
    assert.strictEqual(data.title, movieDetails.title, 'Movie title should match');
    assert.strictEqual(data.posterUrl, movieDetails.posterUrl, 'Movie posterUrl should match');
    assert.strictEqual(data.rating, movieDetails.rating, 'Movie rating should match');
    assert.strictEqual(data.sourceUrl, movieDetails.sourceUrl, 'Movie sourceUrl should match');
    createdMovieId = data.id;
  });

  it('Retrieve watchlist and confirm manual item is present', async () => {
    const res = await client.get('/api/watchlist');
    assert.ok(res.ok, `GET /api/watchlist failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Watchlist should be an array');
    
    const foundMovie = data.find((movie) => movie.id === createdMovieId);
    assert.ok(foundMovie, 'Watchlist should contain the added movie');
    assert.strictEqual(foundMovie.title, movieDetails.title);
  });

  it('Delete movie item from watchlist', async () => {
    assert.ok(createdMovieId, 'Requires a valid createdMovieId');
    const res = await client.delete(`/api/watchlist?id=${createdMovieId}`);
    assert.ok(res.ok, `DELETE /api/watchlist failed with status ${res.status}`);
  });

  it('Confirm watchlist is empty after deletion', async () => {
    const res = await client.get('/api/watchlist');
    assert.ok(res.ok, `GET /api/watchlist failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Watchlist should be an array');
    assert.strictEqual(data.length, 0, 'Watchlist should be empty after deletion');
  });
});
