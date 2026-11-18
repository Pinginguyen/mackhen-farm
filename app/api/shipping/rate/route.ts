import { NextResponse } from 'next/server';

import { calculateRealtimeShippingRate } from '@/lib/services/shipping-carrier';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_SHIPPING_RATE', message: 'Thông tin địa chỉ giao hàng không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: { code: 'INVALID_SHIPPING_RATE', message: 'Thông tin địa chỉ giao hàng không hợp lệ.' } }, { status: 400 });
  }

  const body = payload as { province?: unknown; district?: unknown; weightGrams?: unknown };
  if (typeof body.province !== 'string' || typeof body.district !== 'string'
    || !Number.isSafeInteger(body.weightGrams) || Number(body.weightGrams) < 1 || Number(body.weightGrams) > 500_000) {
    return NextResponse.json({ error: { code: 'INVALID_SHIPPING_RATE', message: 'Vui lòng chọn tỉnh và quận/huyện hợp lệ.' } }, { status: 400 });
  }

  try {
    const rate = await calculateRealtimeShippingRate({
      province: body.province,
      district: body.district,
      weightGrams: Number(body.weightGrams),
    });
    return NextResponse.json(rate, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof Error && error.message === 'INVALID_SHIPPING_RATE_INPUT';
    return NextResponse.json({
      error: {
        code: invalidInput ? 'INVALID_SHIPPING_RATE' : 'SHIPPING_RATE_UNAVAILABLE',
        message: invalidInput ? 'Vui lòng chọn tỉnh và quận/huyện hợp lệ.' : 'Không thể lấy phí vận chuyển lúc này. Vui lòng thử lại.',
      },
    }, { status: invalidInput ? 400 : 502, headers: { 'cache-control': 'no-store' } });
  }
}
