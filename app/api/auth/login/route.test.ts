import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, update, comparePassword, prisma } = vi.hoisted(() => {
  const mocks = { findUnique: vi.fn(), update: vi.fn(), comparePassword: vi.fn() };
  return {
    ...mocks,
    prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('bcryptjs', () => ({ compare: comparePassword }));

import { POST } from './route';
import { verifySessionToken } from '@/lib/auth';

const secret = 'vercel-admin-session-secret-with-32-characters';

function login(email: string, password = 'correct-password', ip = '203.0.113.10') {
  return new Request('https://mackhen.example/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email, password }),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    delete process.env.NEXTAUTH_SECRET;
    findUnique.mockReset().mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@mackhenfarm.vn',
      role: 'CUSTOMER',
      password: 'stored-hash',
    });
    update.mockReset().mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@mackhenfarm.vn',
      role: 'ADMIN',
    });
    comparePassword.mockReset().mockResolvedValue(true);
  });

  it('promotes the authenticated reserved admin account and signs ADMIN into the session', async () => {
    const response = await POST(login('ADMIN@MACKHENFARM.VN'));
    const cookie = response.headers.get('set-cookie');
    const sessionToken = cookie?.match(/mkf_session=([^;]+)/)?.[1];

    expect(response.status).toBe(200);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Path=/');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });
    expect(verifySessionToken(sessionToken)?.role).toBe('ADMIN');
    expect(await response.json()).toMatchObject({ user: { role: 'ADMIN' } });
  });

  it('does not elevate the reserved account when its password is invalid', async () => {
    comparePassword.mockResolvedValue(false);
    const response = await POST(login('admin@mackhenfarm.vn'));

    expect(response.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 401 when no account matches the email', async () => {
    findUnique.mockResolvedValue(null);
    const response = await POST(login('missing@example.com'));

    expect(response.status).toBe(401);
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('blocks login after five failed attempts for the same IP and email', async () => {
    comparePassword.mockResolvedValue(false);

    const responses = await Promise.all(Array.from({ length: 6 }, () => POST(login('bruteforce@example.com'))));
    const blocked = responses.find((response) => response.status === 429);
    expect(responses.filter((response) => response.status === 401)).toHaveLength(5);
    expect(blocked).toBeDefined();
    if (!blocked) throw new Error('Expected the sixth concurrent attempt to be rate limited.');

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
    expect(await blocked.json()).toEqual({ error: 'Quá nhiều lần thử thất bại. Vui lòng thử lại sau 1 phút.' });
    expect(comparePassword).toHaveBeenCalledTimes(5);
  });

  it('returns 401 when the account has no password hash', async () => {
    findUnique.mockResolvedValue({
      id: 'customer-1',
      name: 'Customer',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      password: '',
    });
    const response = await POST(login('customer@example.com'));

    expect(response.status).toBe(401);
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('keeps a regular customer role unchanged', async () => {
    findUnique.mockResolvedValue({
      id: 'customer-1',
      name: 'Customer',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      password: 'stored-hash',
    });
    const response = await POST(login('customer@example.com'));
    const sessionToken = response.headers.get('set-cookie')?.match(/mkf_session=([^;]+)/)?.[1];

    expect(response.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(verifySessionToken(sessionToken)?.role).toBe('CUSTOMER');
  });

  it('keeps the AFFILIATE role in the login response and session', async () => {
    findUnique.mockResolvedValue({
      id: 'affiliate-user-1',
      name: 'KOC Partner',
      email: 'koc@example.com',
      role: 'AFFILIATE',
      password: 'stored-hash',
    });

    const response = await POST(login('koc@example.com', 'KocPass123'));
    const sessionToken = response.headers.get('set-cookie')?.match(/mkf_session=([^;]+)/)?.[1];

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { role: 'AFFILIATE' } });
    expect(verifySessionToken(sessionToken)?.role).toBe('AFFILIATE');
  });

  it('accepts NEXTAUTH_SECRET when AUTH_SECRET is not set', async () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = secret;
    findUnique.mockResolvedValue({
      id: 'customer-1',
      name: 'Customer',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      password: 'stored-hash',
    });

    const response = await POST(login('customer@example.com'));

    expect(response.status).toBe(200);
    expect(verifySessionToken(response.headers.get('set-cookie')?.match(/mkf_session=([^;]+)/)?.[1])?.role).toBe('CUSTOMER');
  });
});