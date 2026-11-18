import { NextResponse } from 'next/server';
import { recordApiMetric } from '@/lib/api-metrics';
import { reportPrismaConnectivityIssue } from '@/lib/prisma';

const DATABASE_FAILURE_THRESHOLD = 5;
const DATABASE_CIRCUIT_COOLDOWN_MS = 15_000;

type DatabaseCircuit = { failures: number; openedUntil: number };

declare global {
  var __mackhenDatabaseCircuit: DatabaseCircuit | undefined;
}

function databaseCircuit(): DatabaseCircuit {
  globalThis.__mackhenDatabaseCircuit ??= { failures: 0, openedUntil: 0 };
  return globalThis.__mackhenDatabaseCircuit;
}

function databaseErrorCode(error: unknown): string {
  return error instanceof Error && 'code' in error ? String((error as Error & { code?: unknown }).code ?? '') : '';
}

function isDatabaseConnectivityError(error: unknown): boolean {
  const code = databaseErrorCode(error);
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2037', 'ETIMEDOUT'].includes(code)
    || error instanceof Error && /connection.*(timeout|timed out|closed|refused)|pool.*(timeout|exhausted)|timed out fetching a new connection/i.test(error.message);
}

function databaseUnavailableResponse(status: 503 | 504, retryAfter?: number): NextResponse {
  const response = NextResponse.json({
    error: {
      code: status === 504 ? 'DATABASE_TIMEOUT' : 'DATABASE_UNAVAILABLE',
      message: 'Hệ thống đang bận, vui lòng thử lại sau.',
    },
  }, { status, headers: { 'Cache-Control': 'no-store', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) } });
  return response;
}

export function getDatabaseCircuitStatus(): { state: 'closed' | 'open'; retryInMs: number } {
  const circuit = databaseCircuit();
  const retryInMs = Math.max(0, circuit.openedUntil - Date.now());
  return { state: retryInMs > 0 ? 'open' : 'closed', retryInMs };
}

export async function withDatabase(operation: () => Promise<NextResponse>, errorLabel?: string): Promise<NextResponse> {
  const startedAt = Date.now();
  const circuit = databaseCircuit();
  const retryInMs = Math.max(0, circuit.openedUntil - Date.now());
  if (retryInMs > 0) {
    const response = databaseUnavailableResponse(503, Math.ceil(retryInMs / 1000));
    recordApiMetric(response.status, Date.now() - startedAt);
    return response;
  }
  if (circuit.openedUntil) {
    circuit.openedUntil = 0;
    circuit.failures = 0;
  }

  try {
    const response = await operation();
    if (response.status < 500) circuit.failures = 0;
    recordApiMetric(response.status, Date.now() - startedAt);
    return response;
  } catch (error) {
    if (errorLabel) console.error(errorLabel, error);
    reportPrismaConnectivityIssue(error, errorLabel);
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      const response = NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn kho' } }, { status: 409 });
      recordApiMetric(response.status, Date.now() - startedAt);
      return response;
    }
    if (isDatabaseConnectivityError(error)) {
      circuit.failures += 1;
      if (circuit.failures >= DATABASE_FAILURE_THRESHOLD) {
        circuit.openedUntil = Date.now() + DATABASE_CIRCUIT_COOLDOWN_MS;
      }
      const code = databaseErrorCode(error);
      const timedOut = ['P1002', 'P1008', 'P2024', 'ETIMEDOUT'].includes(code)
        || error instanceof Error && /timeout|timed out/i.test(error.message);
      const response = databaseUnavailableResponse(timedOut ? 504 : 503);
      recordApiMetric(response.status, Date.now() - startedAt);
      return response;
    }
    if (error instanceof Error && error.name.startsWith('PrismaClient')) {
      console.error('[CRITICAL_DB_ERROR] Chi tiết lỗi tại file này:', error.message || error);
      const response = NextResponse.json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Hệ thống đang bận, vui lòng thử lại sau.' } }, { status: 503 });
      recordApiMetric(response.status, Date.now() - startedAt);
      return response;
    }
    console.error('API operation failed:', error);
    const response = NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể hoàn tất yêu cầu lúc này.' } }, { status: 500 });
    recordApiMetric(response.status, Date.now() - startedAt);
    return response;
  }
}