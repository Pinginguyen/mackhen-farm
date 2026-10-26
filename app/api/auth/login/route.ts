import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ADMIN_EMAIL, createSessionToken, getAuthSecret, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || typeof body.password !== 'string' || !body.password) return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    if (!getAuthSecret()) {
      return NextResponse.json({ error: 'Máy chủ chưa cấu hình AUTH_SECRET hoặc NEXTAUTH_SECRET (tối thiểu 32 ký tự).' }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }
    if (!(await compare(body.password, user.password))) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }
    const role = email === ADMIN_EMAIL ? 'ADMIN' : user.role;
    const authenticatedUser = role === user.role
      ? user
      : await prisma.user.update({ where: { id: user.id }, data: { role }, select: { id: true, name: true, email: true, role: true } });
    const token = createSessionToken({ userId: authenticatedUser.id, name: authenticatedUser.name, email: authenticatedUser.email, role });
    if (!token) return NextResponse.json({ error: 'Máy chủ chưa sẵn sàng xác thực phiên đăng nhập.' }, { status: 503 });

    const response = NextResponse.json({ user: { id: authenticatedUser.id, name: authenticatedUser.name, email: authenticatedUser.email, role } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('[AUTH_ERROR_DETAIL]:', error);
    return NextResponse.json({ error: 'Không thể đăng nhập lúc này.' }, { status: 500 });
  }
}