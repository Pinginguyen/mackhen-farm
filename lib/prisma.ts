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
  const isPooler = datasourceUrl.hostname.includes('-pooler.') || datasourceUrl.searchParams.has('pgbouncer');
  if (isPooler || process.env.VERCEL) datasourceUrl.searchParams.set('pgbouncer', 'true');
  if (process.env.VERCEL) datasourceUrl.searchParams.set('connection_limit', '1');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  datasourceUrl ? { datasourceUrl: datasourceUrl.toString() } : undefined,
);

globalForPrisma.prisma = prisma;