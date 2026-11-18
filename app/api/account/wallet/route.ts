import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: 'Cần đăng nhập để xem ví nội bộ.' }, { status: 401 });

  return withDatabase(async () => {
    const wallet = await prisma.wallet.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId },
      update: {},
      select: {
        balance: true,
        transactions: { select: { id: true, amount: true, type: true, description: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    return NextResponse.json({ wallet });
  }, 'Account wallet lookup failed');
}