import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { createSessionToken } from './lib/auth';
import { middleware } from './middleware';

const originalSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const secret = 'middleware-rbac-test-secret-with-32-characters';

function makeRequest(path: string, role?: 'CUSTOMER' | 'ADMIN') {
  const token = role ? createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role }) : null;
  return new NextRequest(`https://mackhen.example${path}`, { headers: token ? { cookie: `mkf_session=${token}` } : undefined });
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

  it('redirects customers away from admin with a forbidden notice', async () => {
    const response = await middleware(makeRequest('/admin', 'CUSTOMER'));
    expect(response.headers.get('location')).toBe('https://mackhen.example/?error=forbidden');
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
});