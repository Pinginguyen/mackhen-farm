import { NextResponse } from 'next/server';
import type { ShippingCarrier } from '@prisma/client';

import { requireAdmin } from '@/lib/admin-auth';
import { createShipmentOrder } from '@/lib/services/shipping-carrier';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : '';
  const carrier = payload.carrier;
  if (!orderId || (carrier !== 'GHTK' && carrier !== 'VIETTEL_POST')) {
    return NextResponse.json({ error: { message: 'Chọn GHTK hoặc Viettel Post và kiểm tra mã đơn.' } }, { status: 400 });
  }

  try {
    const shipment = await createShipmentOrder(orderId, carrier as ShippingCarrier);
    return NextResponse.json({ shipment });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
      ORDER_NOT_SHIPPABLE: 'Đơn đã hủy hoặc hoàn hàng, không thể tạo vận đơn.',
      ORDER_PAYMENT_PENDING: 'Cần xác nhận thanh toán trước khi tạo vận đơn.',
      CARRIER_CONFIGURATION_INCOMPLETE: 'Cấu hình API vận chuyển chưa đầy đủ.',
      SHIPMENT_SAVE_CONFLICT: 'Đơn vừa được tạo vận đơn ở một thao tác khác. Hãy tải lại trang.',
    };
    console.error('Shipment creation failed:', code || 'UnknownError');
    return NextResponse.json({ error: { message: messages[code] ?? 'Đối tác vận chuyển chưa thể tạo vận đơn.' } }, {
      status: code === 'ORDER_NOT_FOUND' ? 404 : code.startsWith('ORDER_') ? 409 : 502,
    });
  }
}