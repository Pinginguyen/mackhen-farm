import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import VietQrPaymentDetails from './payment-details';

export const dynamic = 'force-dynamic';
const defaultCheckoutAmount = 155000;

function createQrUrl(bankId: string, accountNumber: string, accountName: string, amount: number, orderCode: string) {
  const qrUrl = new URL(`https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png`);
  qrUrl.searchParams.set('amount', String(amount));
  qrUrl.searchParams.set('addInfo', orderCode);
  qrUrl.searchParams.set('accountName', accountName);
  return qrUrl.toString();
}

export default async function VietQrOrderPage({
  params,
  searchParams,
}: {
  params: { orderCode: string };
  searchParams?: { demo?: string; amount?: string };
}) {
  const bankId = process.env.VIETQR_BANK_ID ?? 'MB';
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER ?? '0762793244';
  const accountName = process.env.VIETQR_ACCOUNT_NAME ?? 'TRAN TRUNG CHAU';
  const orderCode = params.orderCode.trim().toUpperCase();
  const requestedAmount = Number(searchParams?.amount);
  const queryAmount = Number.isSafeInteger(requestedAmount) && requestedAmount > 0
    ? requestedAmount
    : defaultCheckoutAmount;

  if (!/^MKF-\d{6}$/.test(orderCode)) notFound();

  let order: Awaited<ReturnType<typeof prisma.order.findUnique>> & { items?: { productId: string; productName: string; variantLabel: string | null; quantity: number; price: number }[] } | null = null;
  let payment: { id: string; createdAt: Date; status: string } | null = null;
  let paymentAvailable = false;
  let invalidPaymentMethod = false;

  try {
    const foundOrder = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        items: { select: { productId: true, productName: true, variantLabel: true, quantity: true, price: true } },
      },
    });

    if (foundOrder && foundOrder.paymentMethod !== 'VIETQR') {
      invalidPaymentMethod = true;
    } else if (foundOrder) {
      order = foundOrder;
      payment = foundOrder.payments[0] ?? await prisma.payment.create({
        data: { orderId: foundOrder.id, orderCode: foundOrder.numericCode, amount: foundOrder.totalAmount },
        select: { id: true, createdAt: true, status: true },
      });
      paymentAvailable = true;
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_NOT_FOUND')) throw error;
    console.error('Unable to load VietQR order; rendering local pending payment.', error instanceof Error ? error.name : 'UnknownError');
  }
  if (invalidPaymentMethod) notFound();

  const amount = order?.totalAmount ?? queryAmount;
  const transferContent = order?.orderCode ?? orderCode;
  const qrUrl = createQrUrl(bankId, accountNumber, accountName, amount, transferContent);
  const paymentCreatedAt = payment?.createdAt ?? new Date();
  const expiresAt = new Date(paymentCreatedAt.getTime() + 15 * 60 * 1000).toISOString();
  const isLocalOnly = !order || !paymentAvailable;
  const items = order?.items ?? [];

  return (
    <main className="page-shell">
      <section className="page-card payment-page">
        <VietQrPaymentDetails
          orderCode={transferContent}
          amount={amount}
          bankId={bankId}
          accountNumber={accountNumber}
          accountName={accountName}
          qrUrl={qrUrl}
          orderId={order?.id}
          createdAt={order?.createdAt.toISOString() ?? paymentCreatedAt.toISOString()}
          items={items}
          expiresAt={expiresAt}
          alreadyConfirmed={order?.paymentStatus === 'PAID' && payment?.status === 'PAID'}
          isLocalOnly={isLocalOnly}
        />
      </section>
    </main>
  );
}