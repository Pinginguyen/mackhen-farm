import * as Sentry from '@sentry/nextjs';
import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes('\n')) {
  connectionString = connectionString.split('\n')[0].trim();
}
if (connectionString.startsWith('DATABASE_URL=')) {
  connectionString = connectionString.replace(/^DATABASE_URL=/, '').trim();
}
connectionString = connectionString.replace(/^['"]|['"]$/g, '').trim();

let datasourceUrl: URL | undefined;
if (connectionString) {
  try {
    datasourceUrl = new URL(connectionString);
    datasourceUrl.hash = '';
    datasourceUrl.searchParams.delete('channel_binding');
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
    datasourceUrl.searchParams.set('connection_limit', process.env.VERCEL ? '1' : '10');
    datasourceUrl.searchParams.set('pool_timeout', '10');
  }
}

function createPrismaClient() {
  const log: Prisma.LogDefinition[] = [{ emit: 'event', level: 'error' }];
  if (process.env.NODE_ENV === 'development') {
    log.push({ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' });
  }

  const client = new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl: datasourceUrl.toString() } : {}),
    log,
  });
  client.$on('error', (event) => {
    if (!/timeout|timed out|connection|pool/i.test(event.message)) return;
    console.warn('[PRISMA_CONNECTION_WARNING]', event.message);
    Sentry.captureMessage('Transient Prisma connection or pool timeout', {
      level: 'warning',
      tags: { component: 'prisma', database: 'neon' },
      extra: { target: event.target, message: event.message },
    });
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

export function reportPrismaConnectivityIssue(error: unknown, operation?: string) {
  if (!(error instanceof Error)) return;
  const code = 'code' in error ? String((error as Error & { code?: unknown }).code ?? '') : '';
  if (!['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2037'].includes(code)
    && !/connection.*(timeout|timed out|closed|refused)|pool.*(timeout|exhausted)|timed out fetching a new connection/i.test(error.message)) return;

  try {
    Sentry.captureException(error, {
      level: 'warning',
      tags: { component: 'prisma', operation: operation ?? 'database-query', errorCode: code || 'CONNECTION_TIMEOUT' },
    });
  } catch {
    console.warn('[PRISMA_CONNECTION_WARNING]', code || error.name);
  }
}

globalForPrisma.prisma = prisma;