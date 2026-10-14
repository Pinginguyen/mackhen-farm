import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';
import PaymentConfirmation from '../../payment/payment-confirmation';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default async function MomoSandboxPage({ params }: { params: { orderCode: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderCode: params.orderCode },
    include: { payments: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order || order.paymentMethod !== 'MOMO') notFound();

  const payment = order.payments[0] ?? await prisma.payment.create({
    data: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount },
  });
  const expiresAt = new Date(payment.createdAt.getTime() + 15 * 60 * 1000).toISOString();
  const sandboxPayload = `MOMO-SANDBOX|${order.orderCode}|${order.totalAmount}`;
  const qrDataUrl = await QRCode.toDataURL(sandboxPayload, {
    width: 260,
    margin: 1,
    color: { dark: '#421b80', light: '#ffffff' },
  });

  return (
    <main className="page-shell">
      <Header />
      <section className="momo-sandbox-page">
        <div className="momo-sandbox-brand"><span>M</span><strong>MoMo</strong><small>DEMO SANDBOX</small></div>
        <p className="momo-sandbox-note">Môi trường mô phỏng · Không trừ tiền thật</p>
        <h1>Quét mã để thanh toán</h1>
        <p>Đơn hàng {order.orderCode}</p>
        <strong className="momo-sandbox-amount">{formatCurrency(order.totalAmount)}</strong>
        <img className="momo-sandbox-qr" src={qrDataUrl} alt={`QR mô phỏng MoMo cho ${order.orderCode}`} />
        <p className="momo-sandbox-instruction">Quét mã demo hoặc xác nhận thanh toán để kiểm thử luồng đơn hàng.</p>
        <PaymentConfirmation orderCode={order.orderCode} orderId={order.id} expiresAt={expiresAt} alreadyConfirmed={order.paymentStatus === 'PAID'} paymentMethod="MOMO" />
        <Link className="momo-back-link" href="/tra-cuu">Theo dõi đơn hàng</Link>
      </section>
    </main>
  );
}