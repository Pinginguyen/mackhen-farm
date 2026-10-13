import { NextResponse } from 'next/server';

export async function withDatabase(operation: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn kho' } }, { status: 409 });
    }
    if (error instanceof Error && error.name.startsWith('PrismaClient')) {
      return NextResponse.json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Dịch vụ dữ liệu hiện không khả dụng' } }, { status: 503 });
    }
    console.error('API operation failed:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể hoàn tất yêu cầu lúc này.' } }, { status: 500 });
  }
}