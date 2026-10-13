import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unavailable';
  }

  const status = database === 'healthy' ? 200 : 503;
  return Response.json({ status: database === 'healthy' ? 'ok' : 'degraded', services: { database, storage: 'not_configured' } }, { status });
}
