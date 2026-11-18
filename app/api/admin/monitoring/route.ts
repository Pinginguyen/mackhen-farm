import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getApiMetrics } from '@/lib/api-metrics';
import { getDatabaseCircuitStatus } from '@/lib/api-database';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const [databaseCheck, redisCheck] = await Promise.all([
    (async () => {
      const startedAt = Date.now();
      try {
        await withTimeout(() => prisma.$queryRaw`SELECT 1`, 2500);
        return { status: 'healthy' as const, latencyMs: Date.now() - startedAt };
      } catch {
        return { status: 'unavailable' as const, latencyMs: null };
      }
    })(),
    (async () => {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return { status: 'not_configured' as const, latencyMs: null };
      const startedAt = Date.now();
      try {
        await withTimeout(() => new Redis({ url, token }).ping(), 2500);
        return { status: 'healthy' as const, latencyMs: Date.now() - startedAt };
      } catch {
        return { status: 'unavailable' as const, latencyMs: null };
      }
    })(),
  ]);
  const configuredUrl = process.env.DATABASE_URL ?? '';
  return NextResponse.json({
    database: databaseCheck.status,
    databaseLatencyMs: databaseCheck.latencyMs,
    redis: redisCheck,
    databaseCircuit: getDatabaseCircuitStatus(),
    connectionPooler: configuredUrl.includes('-pooler.') || configuredUrl.includes('pgbouncer') ? 'pooler-configured' : 'pooler-not-detected',
    api: getApiMetrics(),
    measuredAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}