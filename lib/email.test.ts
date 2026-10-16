import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { sendCompensationVoucherEmail, sendPasswordResetEmail } from './email';

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

describe('sendCompensationVoucherEmail', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_USER', 'shop@example.com');
    vi.stubEnv('SMTP_PASSWORD', 'test-app-password');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mackhenfarm.vn/');
    createTransport.mockReset().mockReturnValue({ sendMail });
    sendMail.mockReset().mockResolvedValue({ messageId: 'mail-2' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends the compensation voucher code and percentage with a store CTA', async () => {
    await sendCompensationVoucherEmail({
      toEmail: 'customer@example.com',
      orderCode: 'MKF-123456',
      voucherCode: 'MKF50-45498D03',
      discountValue: 50,
      discountType: 'PERCENTAGE',
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'customer@example.com',
      subject: '[Mắc Khén Farm] Mã voucher bồi thường cho đơn hàng MKF-123456',
      text: expect.stringContaining('giảm 50%'),
      html: expect.stringContaining('MKF50-45498D03'),
    }));
    expect(sendMail.mock.calls[0][0].html).toContain('Dùng ngay tại cửa hàng');
    expect(sendMail.mock.calls[0][0].html).toContain('href="https://mackhenfarm.vn/san-pham"');
  });

  it('formats fixed-value compensation vouchers as currency', async () => {
    await sendCompensationVoucherEmail({
      toEmail: 'customer@example.com', orderCode: 'MKF-123456', voucherCode: 'COMP-MKF-123456',
      discountValue: 50000, discountType: 'FIXED',
    });

    expect(sendMail.mock.calls[0][0].text).toContain('giảm 50.000đ');
  });
});
