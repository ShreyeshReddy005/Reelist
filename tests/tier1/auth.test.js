import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TestClient, BASE_URL } from '../test-utils.js';

describe('Auth Flow E2E Tests', () => {
  const client = new TestClient(BASE_URL);
  const email = `test_user_${Date.now()}@example.com`;
  const password = 'Password123!';

  it('Successful SignUp with new email', async () => {
    const res = await client.post('/api/auth/signup', { email, password });
    assert.ok(res.ok, `SignUp request failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(data && data.user, 'Response should contain user object');
    assert.strictEqual(data.user.email, email, 'Signed up user email should match');
    assert.ok(data.user.id, 'Signed up user should have an ID');
  });

  it('Successful SignIn with registered email', async () => {
    const signInClient = new TestClient(BASE_URL);
    const res = await signInClient.post('/api/auth/signin', { email, password });
    assert.ok(res.ok, `SignIn request failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(data && data.user, 'Response should contain user object');
    assert.strictEqual(data.user.email, email, 'Signed in user email should match');
    assert.ok(data.user.id, 'Signed in user should have an ID');
  });

  it('Get Active Session returns current user payload', async () => {
    const res = await client.get('/api/auth/session');
    assert.ok(res.ok, `Session request failed with status ${res.status}`);
    const data = await res.json();
    assert.ok(data && data.user, 'Session response should contain user object');
    assert.strictEqual(data.user.email, email, 'Session user email should match');
  });

  it('Successful SignOut invalidates session', async () => {
    const res = await client.post('/api/auth/signout', {});
    assert.ok(res.ok, `SignOut request failed with status ${res.status}`);
  });

  it('Check active session returns 401/null post-logout', async () => {
    const res = await client.get('/api/auth/session');
    if (res.status === 401) {
      assert.strictEqual(res.status, 401);
    } else {
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(!data || data.user === null, 'Session should be null post-logout');
    }
  });
});
