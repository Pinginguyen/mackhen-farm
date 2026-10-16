import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(request: Request) {
  let body: { token?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  const token = body.token?.trim();
  const newPassword = body.newPassword;
  if (!token || !/^[a-f0-9]{64}$/i.test(token) || !newPassword || newPassword.length < 10 || newPassword.length > 100 || body.confirmPassword !== newPassword) {
    return NextResponse.json({ error: 'Liên kết không hợp lệ hoặc mật khẩu xác nhận không khớp. Mật khẩu cần từ 10 đến 100 ký tự.' }, { status: 400 });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  return withDatabase(async () => {
    const validToken = await prisma.passwordResetToken.findFirst({
      where: { token: tokenHash, expiresAt: { gt: new Date() } },
      select: { id: true, email: true },
    });
    if (!validToken) return NextResponse.json({ error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' }, { status: 400 });

    const password = await hash(newPassword, 12);
    const changed = await prisma.$transaction(async (transaction) => {
      const resetToken = await transaction.passwordResetToken.findFirst({
        where: { token: tokenHash, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!resetToken) return false;

      await transaction.user.update({ where: { email: validToken.email }, data: { password } });
      await transaction.passwordResetToken.deleteMany({ where: { email: validToken.email } });
      return true;
    });

    if (!changed) return NextResponse.json({ error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    return NextResponse.json({ message: 'Đổi mật khẩu thành công.' });
  });
}