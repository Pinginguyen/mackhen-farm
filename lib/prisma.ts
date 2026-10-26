import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes('\n')) {
  connectionString = connectionString.split('\n')[0].trim();
}
if (connectionString.startsWith('DATABASE_URL=')) {
  connectionString = connectionString.replace(/^DATABASE_URL=/, '').trim();
}
connectionString = connectionString.replace(/^['"]|['"]$/g, '').trim();
connectionString = connectionString.replace(/&channel_binding=[^&]+/g, '');

let datasourceUrl: URL | undefined;
if (connectionString) {
  try {
    datasourceUrl = new URL(connectionString);
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