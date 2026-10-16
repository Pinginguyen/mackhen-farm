import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ResendMock, resendSend } = vi.hoisted(() => ({
  ResendMock: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock('resend', () => ({ Resend: ResendMock }));

import { sendPasswordResetEmail } from './email';

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test_api_key');
    ResendMock.mockReset().mockImplementation(() => ({ emails: { send: resendSend } }));
    resendSend.mockReset().mockResolvedValue({ data: { id: 'mail-1' }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses Resend and sends the reset link in a branded email', async () => {
    const resetLink = 'https://mackhenfarm.vn/dat-lai-mat-khau?token=abc123';
    await sendPasswordResetEmail('customer@example.com', resetLink);

    expect(ResendMock).toHaveBeenCalledWith('re_test_api_key');
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Mắc Khén Farm <onboarding@resend.dev>',
      to: 'customer@example.com',
      subject: '[Mắc Khén Farm] Đặt lại mật khẩu của bạn',
      html: expect.stringContaining(resetLink),
    }));
    expect(resendSend.mock.calls[0][0].html).toContain('15 phút');
    expect(resendSend.mock.calls[0][0].html).toContain('Đặt lại mật khẩu');
  });

  it('fails clearly when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await expect(sendPasswordResetEmail('customer@example.com', 'https://mackhenfarm.vn/reset'))
      .rejects.toThrow('RESEND_API_KEY is not configured.');
    expect(ResendMock).not.toHaveBeenCalled();
  });

  it('throws a generic error when Resend returns an API error', async () => {
    resendSend.mockResolvedValueOnce({ data: null, error: { message: 'provider error' } });

    await expect(sendPasswordResetEmail('customer@example.com', 'https://mackhenfarm.vn/reset'))
      .rejects.toThrow('Resend email delivery failed.');
  });
});
