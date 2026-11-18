import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { createSessionToken } from './lib/auth';
import { middleware } from './middleware';

const originalSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalVercel = process.env.VERCEL;
const originalTrustProxyHeaders = process.env.TRUST_PROXY_HEADERS;
const secret = 'middleware-rbac-test-secret-with-32-characters';

function makeRequest(path: string, role?: 'CUSTOMER' | 'ADMIN', headers: Record<string, string> = {}, method = 'GET') {
  const token = role ? createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role }) : null;
  return new NextRequest(`https://mackhen.example${path}`, {
    method,
    headers: { ...headers, ...(token ? { cookie: `mkf_session=${token}` } : {}) },
  });
}

beforeEach(() => {
  process.env.AUTH_SECRET = secret;
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalTrustProxyHeaders === undefined) delete process.env.TRUST_PROXY_HEADERS;
  else process.env.TRUST_PROXY_HEADERS = originalTrustProxyHeaders;
});

describe('RBAC middleware', () => {
  it('sends anonymous admin requests to login with the admin callback', async () => {
    const response = await middleware(makeRequest('/admin/orders'));
    expect(response.headers.get('location')).toBe('https://mackhen.example/dang-nhap?callbackUrl=%2Fadmin');
  });

  it('sends anonymous account requests to login', async () => {
    const response = await middleware(makeRequest('/tai-khoan/orders'));
    expect(response.headers.get('location')).toBe('https://mackhen.example/dang-nhap?callbackUrl=%2Ftai-khoan');
  });

  it('redirects customers to login when they try to enter admin', async () => {
    const response = await middleware(makeRequest('/admin', 'CUSTOMER'));
    expect(response.headers.get('location')).toBe('https://mackhen.example/dang-nhap?callbackUrl=%2Fadmin');
  });

  it('returns 403 for a customer session calling an admin API', async () => {
    const response = await middleware(makeRequest('/api/admin/orders', 'CUSTOMER'));

    expect(response.status).toBe(403);
  });

  it('allows admin sessions into the admin portal', async () => {
    const response = await middleware(makeRequest('/admin', 'ADMIN'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('allows an admin session when Vercel provides NEXTAUTH_SECRET only', async () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = secret;
    const response = await middleware(makeRequest('/admin', 'ADMIN'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('sets English and SGD defaults for Singapore visitors', async () => {
    const response = await middleware(makeRequest('/', undefined, { 'x-vercel-ip-country': 'SG' }));
    const preference = response.cookies.get('mackhen_locale_currency')?.value;

    expect(preference && JSON.parse(decodeURIComponent(preference))).toEqual({ locale: 'en', currency: 'SGD' });
  });

  it('sets English and SGD defaults for visitors outside Vietnam', async () => {
    const response = await middleware(makeRequest('/', undefined, { 'x-vercel-ip-country': 'FR' }));
    const preference = response.cookies.get('mackhen_locale_currency')?.value;

    expect(preference && JSON.parse(decodeURIComponent(preference))).toEqual({ locale: 'en', currency: 'SGD' });
  });

  it('does not replace a visitor-selected currency with the geo default', async () => {
    const preference = encodeURIComponent(JSON.stringify({ locale: 'vi', currency: 'VND' }));
    const response = await middleware(makeRequest('/', undefined, {
      cookie: `mackhen_locale_currency=${preference}`,
      'x-vercel-ip-country': 'US',
    }));

    expect(response.cookies.get('mackhen_locale_currency')).toBeUndefined();
  });

  it('uses English accept-language when the visitor country is unavailable', async () => {
    const response = await middleware(makeRequest('/', undefined, { 'accept-language': 'en-US,en;q=0.9' }));

    expect(response.cookies.get('mackhen_locale_currency')).toBeDefined();
  });

  it('rate limits checkout requests at the Edge', async () => {
    const request = () => makeRequest('/api/checkout', undefined, {
      'x-real-ip': '198.51.100.11',
      'x-forwarded-for': '203.0.113.250',
    }, 'POST');

    expect((await middleware(request())).status).not.toBe(429);
    expect((await middleware(request())).status).not.toBe(429);
    expect((await middleware(request())).status).not.toBe(429);
    const response = await middleware(request());

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeDefined();
  });

  it('rate limits repeated login requests at the Edge', async () => {
    const request = () => makeRequest('/api/auth/login', undefined, {
      'cf-connecting-ip': '198.51.100.12',
      'x-forwarded-for': '203.0.113.250',
    }, 'POST');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await middleware(request())).status).not.toBe(429);
    }
    expect((await middleware(request())).status).toBe(429);
  });

  it('does not trust client-supplied X-Forwarded-For without a trusted proxy', async () => {
    delete process.env.VERCEL;
    delete process.env.TRUST_PROXY_HEADERS;
    const request = (forwardedFor: string) => makeRequest('/api/orders', undefined, { 'x-forwarded-for': forwardedFor }, 'POST');

    expect((await middleware(request('198.51.100.101'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.102'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.103'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.104'))).status).toBe(429);
  });

  it('uses the client IP from the first X-Forwarded-For entry behind Vercel', async () => {
    process.env.VERCEL = '1';
    const request = (chain: string) => makeRequest('/api/orders', undefined, { 'x-forwarded-for': chain }, 'POST');

    expect((await middleware(request('198.51.100.201, 10.0.0.1'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.201, 10.0.0.2'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.201, 10.0.0.3'))).status).not.toBe(429);
    expect((await middleware(request('198.51.100.201, 10.0.0.4'))).status).toBe(429);
  });
});