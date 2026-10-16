import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { sendPasswordResetEmail } from './email';

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_USER', 'shop@example.com');
    vi.stubEnv('SMTP_PASSWORD', 'test-app-password');
    vi.stubEnv('EMAIL_USER', '');
    vi.stubEnv('EMAIL_PASS', '');
    createTransport.mockReset().mockReturnValue({ sendMail });
    sendMail.mockReset().mockResolvedValue({ messageId: 'mail-1' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses Gmail SMTP over implicit TLS and sends the reset link in a branded email', async () => {
    const resetLink = 'https://mackhenfarm.vn/dat-lai-mat-khau?token=abc123';
    await sendPasswordResetEmail('customer@example.com', resetLink);

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'shop@example.com', pass: 'test-app-password' },
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: '"Mắc Khén Farm" <shop@example.com>',
      to: 'customer@example.com',
      subject: '[Mắc Khén Farm] Yêu cầu đặt lại mật khẩu',
      text: expect.stringContaining(resetLink),
      html: expect.stringContaining(resetLink),
    }));
    expect(sendMail.mock.calls[0][0].html).toContain('15 phút');
    expect(sendMail.mock.calls[0][0].html).toContain('Đặt lại mật khẩu');
  });

  it('supports the legacy email variable names already used in local configuration', async () => {
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASSWORD', '');
    vi.stubEnv('EMAIL_USER', 'legacy@example.com');
    vi.stubEnv('EMAIL_PASS', 'legacy-app-password');

    await sendPasswordResetEmail('customer@example.com', 'https://mackhenfarm.vn/reset');
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: 'legacy@example.com', pass: 'legacy-app-password' } }));
  });

  it('fails clearly when Gmail credentials are missing', async () => {
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASSWORD', '');
    vi.stubEnv('EMAIL_USER', '');
    vi.stubEnv('EMAIL_PASS', '');
    await expect(sendPasswordResetEmail('customer@example.com', 'https://mackhenfarm.vn/reset'))
      .rejects.toThrow('SMTP_USER and SMTP_PASSWORD must be configured.');
    expect(createTransport).not.toHaveBeenCalled();
  });
});
