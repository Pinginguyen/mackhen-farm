import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compare } from 'bcryptjs';

const { userFindUnique, tokenFindFirst, tokenDeleteMany, tokenCreate, txTokenFindFirst, txTokenDeleteMany, userUpdate, sendMail, prisma, transaction } = vi.hoisted(() => {
  const mocks = {
    userFindUnique: vi.fn(),
    tokenFindFirst: vi.fn(),
    tokenDeleteMany: vi.fn(),
    tokenCreate: vi.fn(),
    txTokenFindFirst: vi.fn(),
    txTokenDeleteMany: vi.fn(),
    userUpdate: vi.fn(),
    sendMail: vi.fn(),
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
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

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
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASSWORD', '');
    vi.stubEnv('EMAIL_HOST', '');
    vi.stubEnv('EMAIL_USER', '');
    vi.stubEnv('EMAIL_PASS', '');
    userFindUnique.mockReset().mockResolvedValue({ id: 'user-1' });
    tokenFindFirst.mockReset().mockResolvedValue(null);
    tokenDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    tokenCreate.mockReset().mockResolvedValue({ id: 'token-1' });
    txTokenFindFirst.mockReset().mockResolvedValue({ id: 'token-1' });
    txTokenDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    userUpdate.mockReset().mockResolvedValue({ id: 'user-1' });
    sendMail.mockReset().mockResolvedValue({ messageId: 'mail-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns the requested 404 when the account email is not registered', async () => {
    userFindUnique.mockResolvedValue(null);
    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'missing@example.com' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: 'Không tìm thấy tài khoản với email này' });
    expect(tokenCreate).not.toHaveBeenCalled();
  });

  it('stores an expiring OTP and logs it only when SMTP is not configured', async () => {
    const logger = vi.spyOn(console, 'log').mockImplementation(() => {});
    const response = await sendOtp(post('/api/auth/forgot-password', { email: ' USER@example.com ' }));
    const result = await response.json() as { sent: boolean; testMode: boolean; otp: string };

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ sent: true, testMode: true });
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(tokenCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'user@example.com', token: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(logger).toHaveBeenCalledWith('=== MÃ OTP TEST ===', expect.stringMatching(/^\d{6}$/));
  });

  it('allows a new demo OTP even when a recent code exists', async () => {
    tokenFindFirst.mockResolvedValue({ id: 'recent-token' });
    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sent: true, testMode: true, otp: expect.stringMatching(/^\d{6}$/) });
    expect(tokenCreate).toHaveBeenCalledOnce();
  });

  it('returns the OTP to dev/demo when SMTP delivery fails', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.gmail.com');
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('EMAIL_PASS', 'app-password');
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));
    const result = await response.json() as { sent: boolean; testMode: boolean; otp: string };

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ sent: true, testMode: true });
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(tokenDeleteMany).not.toHaveBeenCalled();
  });

  it('does not expose OTP in production when SMTP is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await sendOtp(post('/api/auth/forgot-password', { email: 'user@example.com' }));
    const result = await response.json() as { error: string; otp?: string };

    expect(response.status).toBe(503);
    expect(result.otp).toBeUndefined();
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { email: 'user@example.com', token: expect.any(String) } });
  });

  it('updates the password and deletes the used OTP', async () => {
    tokenFindFirst.mockResolvedValue({ id: 'token-1' });
    const response = await resetPassword(post('/api/auth/reset-password', {
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'new-secure-password',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: 'Đổi mật khẩu thành công.' });
    const update = userUpdate.mock.calls[0][0] as { where: { email: string }; data: { password: string } };
    expect(update.where).toEqual({ email: 'user@example.com' });
    expect(await compare('new-secure-password', update.data.password)).toBe(true);
    expect(txTokenDeleteMany).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
  });

  it('rejects an invalid or expired OTP without changing the password', async () => {
    txTokenFindFirst.mockResolvedValue(null);
    const response = await resetPassword(post('/api/auth/reset-password', {
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'new-secure-password',
    }));

    expect(response.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});