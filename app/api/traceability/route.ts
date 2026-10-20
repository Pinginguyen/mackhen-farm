import { NextResponse } from 'next/server';

import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const lotCode = new URL(request.url).searchParams.get('lotCode')?.trim().toUpperCase() ?? '';
  if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(lotCode)) {
    return NextResponse.json({ error: { message: 'Mã lô không hợp lệ.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const lot = await prisma.productionLot.findUnique({
      where: { lotCode },
      select: {
        lotCode: true,
        mfgDate: true,
        expDate: true,
        receivedQty: true,
        availableQty: true,
        status: true,
        testReportUrl: true,
        receivingNote: true,
        product: { select: { name: true, slug: true } },
      },
    });
    if (!lot) return NextResponse.json({ error: { message: 'Không tìm thấy thông tin cho mã lô này.' } }, { status: 404 });
    return NextResponse.json({ lot }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }, 'Public lot traceability lookup failed.');
}