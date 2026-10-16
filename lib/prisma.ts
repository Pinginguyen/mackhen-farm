import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;
let datasourceUrl: URL | undefined;
if (databaseUrl) {
  try {
    datasourceUrl = new URL(databaseUrl);
  } catch {
    console.error('DATABASE_URL is not a valid URL; database requests will fail until deployment configuration is corrected.');
  }
}
if (datasourceUrl) {
  if (datasourceUrl.hostname.endsWith('.neon.tech')) {
    const neonEndpoint = datasourceUrl.hostname.match(/^(ep-[^.]+)(\..+)$/);
    if (neonEndpoint && !neonEndpoint[1].endsWith('-pooler')) {
      datasourceUrl.hostname = `${neonEndpoint[1]}-pooler${neonEndpoint[2]}`;
    }
    datasourceUrl.searchParams.set('pgbouncer', 'true');
  }
  const isPooler = datasourceUrl.hostname.includes('-pooler.') || datasourceUrl.searchParams.has('pgbouncer');
  if (isPooler || process.env.VERCEL) {
    datasourceUrl.searchParams.set('pgbouncer', 'true');
    datasourceUrl.searchParams.set('connection_limit', '10');
    datasourceUrl.searchParams.set('pool_timeout', '10');
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  datasourceUrl ? { datasourceUrl: datasourceUrl.toString() } : undefined,
);

globalForPrisma.prisma = prisma;