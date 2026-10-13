import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !body.password) return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      return NextResponse.json({ error: 'Máy chủ chưa cấu hình AUTH_SECRET (tối thiểu 32 ký tự).' }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(body.password, user.password))) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }
    const token = createSessionToken({ userId: user.id, name: user.name, email: user.email, role: user.role });
    if (!token) return NextResponse.json({ error: 'Máy chủ chưa sẵn sàng xác thực phiên đăng nhập.' }, { status: 503 });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Không thể đăng nhập lúc này.' }, { status: 500 });
  }
}