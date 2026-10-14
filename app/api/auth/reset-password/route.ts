import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(request: Request) {
  let body: { email?: string; otp?: string; newPassword?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const otp = body.otp?.trim();
  const newPassword = body.newPassword;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !otp || !/^\d{6}$/.test(otp) || !newPassword || newPassword.length < 10 || newPassword.length > 100) {
    return NextResponse.json({ error: 'Nhập email, mã OTP 6 số và mật khẩu mới từ 10 đến 100 ký tự.' }, { status: 400 });
  }

  const token = createHash('sha256').update(`${email}:${otp}`).digest('hex');
  return withDatabase(async () => {
    const validToken = await prisma.passwordResetToken.findFirst({
      where: { email, token, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!validToken) return NextResponse.json({ error: 'Mã OTP không đúng hoặc đã hết hạn.' }, { status: 400 });

    const password = await hash(newPassword, 12);
    const changed = await prisma.$transaction(async (transaction) => {
      const resetToken = await transaction.passwordResetToken.findFirst({
        where: { email, token, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!resetToken) return false;

      await transaction.user.update({ where: { email }, data: { password } });
      await transaction.passwordResetToken.deleteMany({ where: { email } });
      return true;
    });

    if (!changed) return NextResponse.json({ error: 'Mã OTP không đúng hoặc đã hết hạn.' }, { status: 400 });
    return NextResponse.json({ message: 'Đổi mật khẩu thành công.' });
  });
}