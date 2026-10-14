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

function login(email: string, password = 'correct-password') {
  return new Request('https://mackhen.example/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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