import { NextResponse } from 'next/server';

import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const rawToken = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const session = verifySessionToken(rawToken ? decodeURIComponent(rawToken) : undefined);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 });
    return null;
  } catch {
    return NextResponse.json({ error: 'Không thể xác minh quyền quản trị.' }, { status: 503 });
  }
}