import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionToken, verifySessionToken } from './auth';

const originalSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-session-secret-with-at-least-32-characters';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
});

describe('signed sessions', () => {
  it('verifies a signed user session', () => {
    const token = createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'CUSTOMER' });
    expect(verifySessionToken(token ?? undefined)?.userId).toBe('user-1');
  });

  it('rejects a tampered session token', () => {
    const token = createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' });
    expect(verifySessionToken(`${token}x`)).toBeNull();
  });

  it('fails closed when the session secret is too short', () => {
    process.env.AUTH_SECRET = 'short';
    expect(createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'CUSTOMER' })).toBeNull();
  });

  it('uses NEXTAUTH_SECRET as a fallback when AUTH_SECRET is unset', () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = 'nextauth-compatible-session-secret-over-32-chars';
    const token = createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' });
    expect(verifySessionToken(token ?? undefined)?.role).toBe('ADMIN');
  });

  it('uses NEXTAUTH_SECRET when AUTH_SECRET is invalid', () => {
    process.env.AUTH_SECRET = 'short';
    process.env.NEXTAUTH_SECRET = 'nextauth-compatible-session-secret-over-32-chars';
    const token = createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' });
    expect(verifySessionToken(token ?? undefined)?.role).toBe('ADMIN');
  });
});