import { NextResponse } from 'next/server';
import { recordApiMetric } from '@/lib/api-metrics';

export async function withDatabase(operation: () => Promise<NextResponse>, errorLabel?: string): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    const response = await operation();
    recordApiMetric(response.status, Date.now() - startedAt);
    return response;
  } catch (error) {
    if (errorLabel) console.error(errorLabel, error);
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      const response = NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn kho' } }, { status: 409 });
      recordApiMetric(response.status, Date.now() - startedAt);
      return response;
    }
    if (error instanceof Error && error.name.startsWith('PrismaClient')) {
      const response = NextResponse.json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Dịch vụ dữ liệu hiện không khả dụng' } }, { status: 503 });
      recordApiMetric(response.status, Date.now() - startedAt);
      return response;
    }
    console.error('API operation failed:', error);
    const response = NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể hoàn tất yêu cầu lúc này.' } }, { status: 500 });
    recordApiMetric(response.status, Date.now() - startedAt);
    return response;
  }
}