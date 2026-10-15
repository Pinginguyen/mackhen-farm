import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getApiMetrics } from '@/lib/api-metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const startedAt = Date.now();
  let database: 'healthy' | 'unavailable' = 'healthy';
  let databaseLatencyMs: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - startedAt;
  } catch {
    database = 'unavailable';
  }
  const configuredUrl = process.env.DATABASE_URL ?? '';
  return NextResponse.json({
    database,
    databaseLatencyMs,
    connectionPooler: configuredUrl.includes('-pooler.') || configuredUrl.includes('pgbouncer') ? 'pooler-configured' : 'pooler-not-detected',
    api: getApiMetrics(),
    measuredAt: new Date().toISOString(),
  }, { status: database === 'healthy' ? 200 : 503 });
}