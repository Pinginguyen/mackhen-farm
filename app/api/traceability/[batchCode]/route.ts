import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/system-settings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { batchCode: string } }) {
  const identifier = params.batchCode?.trim() ?? '';
  const batchCode = identifier.toUpperCase();
    const isBatchCode = /^(?:LOT|BATCH)-[A-Z0-9-]{4,60}$/.test(batchCode);
  const isQrToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
  if (!isBatchCode && !isQrToken) {
    return NextResponse.json(
      { success: false, error: 'Mã lô không tồn tại hoặc chưa được phát hành trên hệ thống.' },
      { status: 400 },
    );
  }

  try {
    const lot = await prisma.productionLot.findUnique({
      where: isQrToken ? { qrToken: identifier } : { batchCode },
      include: {
        product: { select: { name: true, slug: true, unit: true, ingredients: true, originRegion: true } },
        variant: { select: { title: true, weight: true } },
      },
    });
    if (!lot) {
      return NextResponse.json(
        { success: false, error: 'Mã lô không tồn tại hoặc đã hết hạn.' },
        { status: 404 },
      );
    }

    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      data: {
        batchCode: lot.batchCode,
        qrToken: lot.qrToken,
        productName: lot.product.name,
        originRegion: lot.product.originRegion ?? 'Sơn La, Tây Bắc',
        manufacturingDate: lot.mfgDate.toISOString().slice(0, 10),
        expiryDate: lot.expDate.toISOString().slice(0, 10),
        packaging: lot.variant?.weight ?? lot.product.unit ?? undefined,
        ingredients: lot.product.ingredients ?? undefined,
        status: lot.expDate <= new Date() ? 'EXPIRED' : lot.status,
        receivedQty: lot.receivedQty,
        testReportUrl: lot.testReportUrl,
        receivingNote: lot.receivingNote,
        dppSupplyGPS: settings.dppSupplyGPS,
        dppLabResult: settings.dppLabResult,
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Batch traceability lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Không thể tra cứu mã lô lúc này.' }, { status: 503 });
  }
}