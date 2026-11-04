import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ADMIN_EMAIL, createSessionToken, getAuthSecret, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 60_000;
const MAX_LOGIN_ATTEMPT_KEYS = 10_000;
const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function getLoginAttemptKey(request: Request, email: string): string {
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
  const ip = request.headers.get('x-real-ip')?.trim() || forwardedIp || 'unknown';
  return `${ip}:${email}`;
}

function getRetryAfterSeconds(key: string, now: number): number {
  const attempt = failedLoginAttempts.get(key);
  if (!attempt) return 0;
  if (attempt.resetAt <= now) {
    failedLoginAttempts.delete(key);
    return 0;
  }
  return attempt.count >= LOGIN_ATTEMPT_LIMIT ? Math.ceil((attempt.resetAt - now) / 1000) : 0;
}

function recordLoginAttempt(key: string, now: number): void {
  const current = failedLoginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    failedLoginAttempts.set(key, { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
  } else {
    current.count += 1;
  }

  if (failedLoginAttempts.size > MAX_LOGIN_ATTEMPT_KEYS) {
    for (const [attemptKey, attempt] of failedLoginAttempts) {
      if (attempt.resetAt <= now) failedLoginAttempts.delete(attemptKey);
    }
    while (failedLoginAttempts.size > MAX_LOGIN_ATTEMPT_KEYS) {
      const oldestKey = failedLoginAttempts.keys().next().value;
      if (!oldestKey) break;
      failedLoginAttempts.delete(oldestKey);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || typeof body.password !== 'string' || !body.password) return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    if (!getAuthSecret()) {
      return NextResponse.json({ error: 'Máy chủ chưa cấu hình AUTH_SECRET hoặc NEXTAUTH_SECRET (tối thiểu 32 ký tự).' }, { status: 503 });
    }

    const attemptKey = getLoginAttemptKey(request, email);
    const retryAfter = getRetryAfterSeconds(attemptKey, Date.now());
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử thất bại. Vui lòng thử lại sau 1 phút.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
      );
    }
    recordLoginAttempt(attemptKey, Date.now());

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }
    if (!(await compare(body.password, user.password))) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }
    failedLoginAttempts.delete(attemptKey);
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