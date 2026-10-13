import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string; phone?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!name || !email || !password || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || password.length > 100) {
      return NextResponse.json({ error: 'Nhập họ tên, email hợp lệ và mật khẩu từ 10 ký tự.' }, { status: 400 });
    }
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      return NextResponse.json({ error: 'Máy chủ chưa cấu hình AUTH_SECRET (tối thiểu 32 ký tự).' }, { status: 503 });
    }

    const user = await prisma.user.create({
      data: { name, email, password: await hash(password, 12), phone: body.phone?.trim() || null },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = createSessionToken({ userId: user.id, name: user.name, email: user.email, role: user.role });
    if (!token) return NextResponse.json({ error: 'Máy chủ chưa sẵn sàng xác thực phiên đăng nhập.' }, { status: 503 });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email này đã được đăng ký.' }, { status: 409 });
    }
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Không thể tạo tài khoản lúc này.' }, { status: 500 });
  }
}