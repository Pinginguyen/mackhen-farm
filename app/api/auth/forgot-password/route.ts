import { createHash, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

function hashOtp(email: string, otp: string) {
  return createHash('sha256').update(`${email}:${otp}`).digest('hex');
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Vui lòng nhập email hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản với email này' }, { status: 404 });

    const now = new Date();
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: { email, createdAt: { gt: new Date(now.getTime() - 60_000) } },
      select: { id: true },
    });
    if (recentToken && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Vui lòng chờ một phút trước khi yêu cầu mã mới.' }, { status: 429 });
    }

    const otp = String(randomInt(100_000, 1_000_000));
    const token = hashOtp(email, otp);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({ where: { email } });
      await transaction.passwordResetToken.create({ data: { email, token, expiresAt } });
    });

    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const username = process.env.EMAIL_USER || process.env.SMTP_USER;
    const password = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
    if (host && username && password) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: username, pass: password },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || username,
          to: email,
          subject: '[Mắc Khén Farm] Mã xác nhận đặt lại mật khẩu',
          text: `Mã xác nhận đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
          html: `<div style="margin:0;padding:36px 16px;background:#f4f1e8;font-family:Arial,sans-serif;color:#23372e"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4dfd2;border-radius:12px;overflow:hidden"><div style="padding:24px 30px;background:#244b3c;color:#fff"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.82">Nông sản sấy vị Tây Bắc</div><h1 style="margin:8px 0 0;font-size:22px">Mắc Khén Farm</h1></div><div style="padding:30px"><h2 style="margin:0 0 12px;font-size:20px">Xác nhận đặt lại mật khẩu</h2><p style="margin:0;color:#59665e;line-height:1.6">Nhập mã dưới đây để tiếp tục. Mã chỉ sử dụng một lần.</p><div style="margin:24px 0;padding:18px;text-align:center;border:1px solid #e4dfd2;border-radius:8px;background:#faf9f5;font-size:34px;font-weight:700;letter-spacing:8px;color:#244b3c">${otp}</div><p style="margin:0;color:#59665e;line-height:1.6">Mã có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div></div></div>`,
        });
        return NextResponse.json({ sent: true, testMode: false });
      } catch (error) {
        console.error('Không gửi được email đặt lại mật khẩu:', error);
        if (process.env.NODE_ENV !== 'production') {
          console.log('=== MÃ OTP TEST ===', otp);
          return NextResponse.json({ sent: true, testMode: true, otp });
        }
        await prisma.passwordResetToken.deleteMany({ where: { email, token } });
        return NextResponse.json({ error: 'Không gửi được email lúc này. Vui lòng thử lại sau.' }, { status: 503 });
      }
    }

    if (process.env.NODE_ENV === 'production') {
      await prisma.passwordResetToken.deleteMany({ where: { email, token } });
      return NextResponse.json({ error: 'Email đặt lại mật khẩu chưa được cấu hình.' }, { status: 503 });
    }

    console.log('=== MÃ OTP TEST ===', otp);
    return NextResponse.json({ sent: true, testMode: true, otp });
  });
}