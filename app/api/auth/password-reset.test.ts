import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compare } from 'bcryptjs';
import { createHash } from 'node:crypto';

const { userFindUnique, tokenFindFirst, tokenDeleteMany, tokenCreate, txTokenFindFirst, txTokenDeleteMany, userUpdate, sendPasswordResetEmail, prisma, transaction } = vi.hoisted(() => {
  const mocks = {
    userFindUnique: vi.fn(),
    tokenFindFirst: vi.fn(),
    tokenDeleteMany: vi.fn(),
    tokenCreate: vi.fn(),
    txTokenFindFirst: vi.fn(),
    txTokenDeleteMany: vi.fn(),
    userUpdate: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  };
  const tx = {
    passwordResetToken: { findFirst: mocks.txTokenFindFirst, deleteMany: mocks.txTokenDeleteMany, create: mocks.tokenCreate },
    user: { update: mocks.userUpdate },
  };
  const client = {
    user: { findUnique: mocks.userFindUnique },
    passwordResetToken: { findFirst: mocks.tokenFindFirst, deleteMany: mocks.tokenDeleteMany },
    $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { ...mocks, transaction: tx, prisma: client };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/email', () => ({ sendPasswordResetEmail }));

import { POST as sendOtp } from './forgot-password/route';
import { POST as resetPassword } from './reset-password/route';

function post(url: string, body: object) {
  return new Request(`https://mackhen.example${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('password reset APIs', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    userFindUnique.mockReset().mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    tokenFindFirst.mockReset().mockResolvedValue(null);
    tokenDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    tokenCreate.mockReset().mockResolvedValue({ id: 'token-1' });
    txTokenFindFirst.mockReset().mockResolvedValue({ id: 'token-1' });
    txTokenDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    userUpdate.mockReset().mockResolvedValue({ id: 'user-1' });
    sendPasswordResetEmail.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns the same success response for an unknown email without sending mail', async () => {
    userFindUnique.mockResolvedValue(null);
    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'missing@example.com' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: expect.any(String) });
    expect(tokenCreate).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a hash of a random token and emails a 15-minute reset link', async () => {
    const now = Date.now();
    const response = await sendOtp(post('/api/auth/forgot-password', { email: ' USER@example.com ' }));
    const resetCall = sendPasswordResetEmail.mock.calls[0] as [string, string];
    const rawToken = new URL(resetCall[1]).searchParams.get('token');
    const stored = tokenCreate.mock.calls[0][0] as { data: { email: string; token: string; expiresAt: Date } };

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: expect.any(String) });
    expect(resetCall[0]).toBe('user@example.com');
    expect(resetCall[1]).toContain('https://mackhen.example/dat-lai-mat-khau?token=');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.data.email).toBe('user@example.com');
    expect(stored.data.token).toBeTruthy();
    expect(stored.data.token).not.toBe(rawToken);
    expect(stored.data.expiresAt.getTime()).toBeGreaterThanOrEqual(now + 15 * 60 * 1000 - 100);
    expect(stored.data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 100);
  });

  it('uses NEXT_PUBLIC_APP_URL when it is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mackhenfarm.vn/');
    await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));

    expect(sendPasswordResetEmail.mock.calls[0][1]).toMatch(/^https:\/\/mackhenfarm\.vn\/dat-lai-mat-khau\?token=/);
  });

  it('does not send repeated requests within the rate-limit window', async () => {
    tokenFindFirst.mockResolvedValue({ id: 'recent-token' });
    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: expect.any(String) });
    expect(tokenCreate).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns the same generic success and removes the token when email delivery fails', async () => {
    sendPasswordResetEmail.mockRejectedValue(new Error('SMTP unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: expect.any(String) });
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { email: 'user@example.com', token: expect.any(String) } });
  });

  it('updates the password and deletes reset tokens using a valid raw token', async () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    tokenFindFirst.mockResolvedValue({ id: 'token-1', email: 'user@example.com' });
    const response = await resetPassword(post('/api/auth/reset-password', {
      token: rawToken,
      newPassword: 'new-secure-password',
      confirmPassword: 'new-secure-password',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: 'Đổi mật khẩu thành công.' });
    expect(tokenFindFirst).toHaveBeenCalledWith({ where: { token: tokenHash, expiresAt: { gt: expect.any(Date) } }, select: { id: true, email: true } });
    const update = userUpdate.mock.calls[0][0] as { where: { email: string }; data: { password: string } };
    expect(update.where).toEqual({ email: 'user@example.com' });
    expect(await compare('new-secure-password', update.data.password)).toBe(true);
    expect(txTokenDeleteMany).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
  });

  it('rejects an invalid or expired token without changing the password', async () => {
    txTokenFindFirst.mockResolvedValue(null);
    const response = await resetPassword(post('/api/auth/reset-password', {
      token: 'b'.repeat(64),
      newPassword: 'new-secure-password',
      confirmPassword: 'new-secure-password',
    }));

    expect(response.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation before querying the token', async () => {
    const response = await resetPassword(post('/api/auth/reset-password', {
      token: 'a'.repeat(64),
      newPassword: 'new-secure-password',
      confirmPassword: 'different-password',
    }));

    expect(response.status).toBe(400);
    expect(tokenFindFirst).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});