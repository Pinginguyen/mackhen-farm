import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail, sendReviewRequestEmail, sendShippingUpdateEmail } from '@/lib/email';

type SentField = 'orderConfirmationEmailSentAt' | 'shippingUpdateEmailSentAt' | 'reviewRequestEmailSentAt';

type NotifiableOrder = NonNullable<Awaited<ReturnType<typeof prisma.order.findUnique>>> & {
  user: { email: string } | null;
  customer: { email: string | null } | null;
  items: { titleSnapshot: string; quantity: number; unitPrice: number; product: { slug: string } }[];
};

async function getOrder(orderId: string): Promise<NotifiableOrder | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true } },
      customer: { select: { email: true } },
      items: { select: { titleSnapshot: true, quantity: true, unitPrice: true, product: { select: { slug: true } } } },
    },
  }) as Promise<NotifiableOrder | null>;
}

async function sendOnce(orderId: string, field: SentField, send: (order: NotifiableOrder, recipient: string) => Promise<void>): Promise<boolean> {
  const claimedAt = new Date();
  const claim = await prisma.order.updateMany({
    where: { id: orderId, [field]: null } as Prisma.OrderWhereInput,
    data: { [field]: claimedAt } as Prisma.OrderUpdateManyMutationInput,
  });
  if (!claim.count) return false;

  try {
    const order = await getOrder(orderId);
    const recipient = order?.user?.email ?? order?.customer?.email;
    if (!order || !recipient) {
      await prisma.order.updateMany({ where: { id: orderId, [field]: claimedAt } as Prisma.OrderWhereInput, data: { [field]: null } as Prisma.OrderUpdateManyMutationInput });
      return false;
    }
    await send(order, recipient);
    return true;
  } catch (error) {
    await prisma.order.updateMany({ where: { id: orderId, [field]: claimedAt } as Prisma.OrderWhereInput, data: { [field]: null } as Prisma.OrderUpdateManyMutationInput }).catch(() => undefined);
    throw error;
  }
}

export function sendOrderConfirmationIfNeeded(orderId: string): Promise<boolean> {
  return sendOnce(orderId, 'orderConfirmationEmailSentAt', async (order, toEmail) => sendOrderConfirmationEmail({
    toEmail,
    customerName: order.customerName,
    orderCode: order.orderCode,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    walletAmountSpent: order.walletAmountSpent,
    items: order.items.map((item) => ({ productName: item.titleSnapshot, quantity: item.quantity, unitPrice: item.unitPrice })),
  }));
}

export function sendShippingUpdateIfNeeded(orderId: string): Promise<boolean> {
  return sendOnce(orderId, 'shippingUpdateEmailSentAt', async (order, toEmail) => {
    if (!order.trackingCode || !order.carrier) throw new Error('SHIPPING_EMAIL_REQUIRES_TRACKING');
    await sendShippingUpdateEmail({
      toEmail,
      customerName: order.customerName,
      orderCode: order.orderCode,
      carrier: order.carrier,
      trackingCode: order.trackingCode,
    });
  });
}

export function sendReviewRequestIfNeeded(orderId: string): Promise<boolean> {
  return sendOnce(orderId, 'reviewRequestEmailSentAt', async (order, toEmail) => {
    await sendReviewRequestEmail({
      toEmail,
      customerName: order.customerName,
      orderCode: order.orderCode,
      products: order.items.map((item) => ({
        productName: item.titleSnapshot,
        productUrl: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/products/${encodeURIComponent(item.product.slug)}?review=1#product-reviews-title`,
      })),
    });
  });
}
