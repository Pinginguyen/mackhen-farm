import { NextResponse } from 'next/server';

export async function withVoucherDatabase(operation: () => Promise<NextResponse>) {
  try {
    return await operation();
  } catch (error) {
    console.error('Voucher database operation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi kết nối cơ sở dữ liệu' },
      { status: 503 },
    );
  }
}