export const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

export class TestClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.cookies = {};
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    options.headers = options.headers || {};
    
    // Inject cookies
    const cookieString = Object.entries(this.cookies)
      .map(([name, val]) => `${name}=${val}`)
      .join('; ');
    if (cookieString) {
      options.headers['Cookie'] = cookieString;
    }

    const res = await fetch(url, options);

    // Capture cookies from Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Basic cookie parser (takes first key-val pair)
      const parts = setCookie.split(';');
      const [name, val] = parts[0].split('=');
      this.cookies[name.trim()] = val.trim();
    }

    return res;
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  async post(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  }

  async delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}
