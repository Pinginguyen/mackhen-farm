import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
    const session = verifySessionToken(token ? decodeURIComponent(token) : undefined);
    if (!session) return NextResponse.json({ user: null });
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, phone: true, address: true, role: true } });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session lookup failed:', error);
    return NextResponse.json({ error: 'Không thể tải phiên đăng nhập.' }, { status: 500 });
  }
}