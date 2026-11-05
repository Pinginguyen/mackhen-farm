import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { createSessionToken } from './lib/auth';
import { middleware } from './middleware';

const originalSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
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
      'x-forwarded-for': '198.51.100.11',
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
      'x-forwarded-for': '198.51.100.12',
    }, 'POST');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await middleware(request())).status).not.toBe(429);
    }
    expect((await middleware(request())).status).toBe(429);
  });
});