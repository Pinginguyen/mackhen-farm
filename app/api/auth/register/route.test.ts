import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userCreate, hashPassword, createSessionToken, getAuthSecret, prisma } = vi.hoisted(() => {
  const userCreate = vi.fn();
  const hashPassword = vi.fn();
  const createSessionToken = vi.fn();
  const getAuthSecret = vi.fn();
  return {
    userCreate,
    hashPassword,
    createSessionToken,
    getAuthSecret,
    prisma: { user: { create: userCreate } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('bcryptjs', () => ({ hash: hashPassword }));
vi.mock('@/lib/auth', () => ({
  ADMIN_EMAIL: 'reserved@example.com',
  createSessionToken,
  getAuthSecret,
  SESSION_COOKIE: 'mkf_session',
  sessionCookieOptions: () => ({ httpOnly: true, sameSite: 'lax', path: '/' }),
}));

import { POST } from './route';

function request(password: string) {
  return new Request('https://mackhen.example/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Customer', email: 'customer@example.com', password }),
  });
}

describe('POST /api/auth/register password length', () => {
  beforeEach(() => {
    userCreate.mockReset().mockResolvedValue({ id: 'customer-1', name: 'Customer', email: 'customer@example.com', role: 'CUSTOMER' });
    hashPassword.mockReset().mockResolvedValue('hashed-password');
    createSessionToken.mockReset().mockReturnValue('session-token');
    getAuthSecret.mockReset().mockReturnValue('configured-secret');
  });

  it('rejects passwords shorter than eight characters with Vietnamese feedback', async () => {
    const response = await POST(request('abc1234'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Nhập họ tên, email hợp lệ và mật khẩu từ 8 ký tự.' });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('accepts an eight-character password', async () => {
    const response = await POST(request('abc12345'));

    expect(response.status).toBe(201);
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: 'hashed-password' }),
    }));
  });
});
