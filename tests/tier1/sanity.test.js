import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TestClient, BASE_URL } from '../test-utils.js';
import reelMapping from '../fixtures/reels/mapping.js';

describe('E2E M1 Infrastructure Sanity Check', () => {
  it('should import TestClient and BASE_URL correctly', () => {
    const client = new TestClient(BASE_URL);
    assert.strictEqual(client.baseUrl, BASE_URL);
    assert.deepStrictEqual(client.cookies, {});
  });

  it('should resolve mapping.js correctly and contain all the fixtures', () => {
    assert.ok(reelMapping);
    assert.ok(reelMapping['https://www.instagram.com/reel/valid_movie/'].includes('reel_valid_movie.json'));
    assert.ok(reelMapping['https://www.instagram.com/reel/no_caption/'].includes('reel_no_caption.json'));
    assert.ok(reelMapping['https://www.instagram.com/reel/scraper_fail/'].includes('reel_scraper_fail.json'));
    assert.ok(reelMapping['https://www.instagram.com/reel/tmdb_fail/'].includes('reel_tmdb_fail.json'));
  });
});
