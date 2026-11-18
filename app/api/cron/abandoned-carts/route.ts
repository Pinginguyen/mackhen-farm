import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { sendAbandonedCartEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return withDatabase(async () => {
    const now = new Date();
    const abandonedBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const staleClaimBefore = new Date(now.getTime() - 15 * 60 * 1000);
    const candidates = await prisma.cart.findMany({
      where: {
        email: { not: null },
        updatedAt: { lte: abandonedBefore },
        checkoutCompletedAt: null,
        abandonmentEmailSentAt: null,
        OR: [{ abandonmentEmailClaimedAt: null }, { abandonmentEmailClaimedAt: { lte: staleClaimBefore } }],
        items: { some: {} },
      },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });

    let sent = 0;
    let failed = 0;
    for (const candidate of candidates) {
      const prepared = await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.cart.updateMany({
          where: {
            id: candidate.id,
            checkoutCompletedAt: null,
            abandonmentEmailSentAt: null,
            OR: [{ abandonmentEmailClaimedAt: null }, { abandonmentEmailClaimedAt: { lte: staleClaimBefore } }],
          },
          data: { abandonmentEmailClaimedAt: now },
        });
        if (claimed.count !== 1) return null;

        const cart = await transaction.cart.findUnique({
          where: { id: candidate.id },
          include: { items: { include: { product: { select: { name: true } }, variant: { select: { title: true } } } } },
        });
        if (!cart?.email || !cart.items.length || cart.checkoutCompletedAt || cart.abandonmentEmailSentAt) {
          await transaction.cart.updateMany({ where: { id: candidate.id, abandonmentEmailClaimedAt: now }, data: { abandonmentEmailClaimedAt: null } });
          return null;
        }

        let voucherCode = cart.abandonmentVoucherCode;
        const existingVoucher = voucherCode ? await transaction.voucher.findUnique({ where: { code: voucherCode } }) : null;
        let voucherExpiresAt = existingVoucher?.expiresAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (!existingVoucher || !existingVoucher.isActive || (existingVoucher.expiresAt && existingVoucher.expiresAt <= now)) {
          voucherCode = `CART-${randomBytes(6).toString('hex').toUpperCase()}`;
          voucherExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          await transaction.voucher.create({
            data: {
              code: voucherCode,
              name: 'Ưu đãi giỏ hàng bỏ quên',
              discountType: 'PERCENTAGE',
              value: 10,
              maxDiscount: 30_000,
              minSpend: 100_000,
              expiresAt: voucherExpiresAt,
              usageLimit: 1,
            },
          });
        }
        if (!voucherCode) throw new Error('ABANDONED_CART_VOUCHER_MISSING');
        await transaction.cart.update({ where: { id: candidate.id }, data: { abandonmentVoucherCode: voucherCode } });
        return {
          email: cart.email,
          voucherCode,
          expiresAt: voucherExpiresAt,
          items: cart.items.map((item) => ({
            name: item.variant ? `${item.product.name} · ${item.variant.title}` : item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };
      });
      if (!prepared) continue;

      try {
        await sendAbandonedCartEmail({
          toEmail: prepared.email,
          voucherCode: prepared.voucherCode,
          expiresAt: prepared.expiresAt,
          cartUrl: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/cart`,
          items: prepared.items,
        });
        await prisma.cart.updateMany({
          where: { id: candidate.id, abandonmentEmailClaimedAt: now },
          data: { abandonmentEmailClaimedAt: null, abandonmentEmailSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        await prisma.cart.updateMany({
          where: { id: candidate.id, abandonmentEmailClaimedAt: now },
          data: { abandonmentEmailClaimedAt: null },
        });
        failed += 1;
        console.error('Abandoned-cart email failed.', error instanceof Error ? error.name : 'UnknownError');
      }
    }

    return NextResponse.json({ success: true, scanned: candidates.length, sent, failed });
  }, 'Abandoned cart email cron failed');
}