import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

const eventTypes = new Set(['PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START']);
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu sự kiện không hợp lệ.' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Dữ liệu sự kiện không hợp lệ.' }, { status: 400 });
  }
  const body = payload as { eventType?: unknown; sessionId?: unknown; productId?: unknown };
  if (typeof body.eventType !== 'string' || !eventTypes.has(body.eventType)
    || typeof body.sessionId !== 'string' || !sessionIdPattern.test(body.sessionId)
    || (body.productId !== undefined && (typeof body.productId !== 'string' || body.productId.length > 128))) {
    return NextResponse.json({ error: 'Loại sự kiện hoặc mã phiên không hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    await prisma.funnelEvent.create({
      data: {
        eventType: body.eventType as string,
        sessionId: body.sessionId as string,
        productId: typeof body.productId === 'string' ? body.productId : null,
      },
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
  });
}