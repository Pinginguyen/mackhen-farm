import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;
const datasourceUrl = databaseUrl ? new URL(databaseUrl) : undefined;
if (datasourceUrl?.hostname.includes('-pooler.')) {
  datasourceUrl.searchParams.set('pgbouncer', 'true');
}
if (datasourceUrl && process.env.VERCEL && !datasourceUrl.searchParams.has('connection_limit')) {
  datasourceUrl.searchParams.set('connection_limit', '1');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  datasourceUrl ? { datasourceUrl: datasourceUrl.toString() } : undefined,
);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}