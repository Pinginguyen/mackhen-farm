import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, products] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
    ]);

    return NextResponse.json({
      success: true,
      db: 'connected',
      users,
      products,
      nodeEnv: process.env.NODE_ENV,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[DIAG_DB_ERROR]:', error);
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : undefined;

    return NextResponse.json({
      success: false,
      db: 'failed',
      error: 'Database connection failed',
      code,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}