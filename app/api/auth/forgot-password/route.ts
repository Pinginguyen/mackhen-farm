import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { sendPasswordResetEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

const genericResponse = () => NextResponse.json({ message: 'Nếu email này đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút.' });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }
  const emailValue = (payload as { email?: unknown }).email;
  const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Vui lòng nhập email hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return genericResponse();

    const now = new Date();
    const recentRequest = await prisma.passwordResetToken.findFirst({
      where: { email, createdAt: { gt: new Date(now.getTime() - 60_000) } },
      select: { id: true },
    });
    if (recentRequest) return genericResponse();

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({ where: { email } });
      await transaction.passwordResetToken.create({ data: { email, token: tokenHash, expiresAt } });
    });

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '');
    const resetLink = `${baseUrl}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (error) {
      console.error('Password reset email delivery failed:', error instanceof Error ? error.message : 'Unknown email error');
      await prisma.passwordResetToken.deleteMany({ where: { email, token: tokenHash } });
    }
    return genericResponse();
  });
}