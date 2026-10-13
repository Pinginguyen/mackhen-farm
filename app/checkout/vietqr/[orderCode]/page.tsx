import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';
import PaymentConfirmation from '../../payment/payment-confirmation';
import CopyPaymentDetails from '../copy-payment-details';

export const dynamic = 'force-dynamic';

export default async function VietQrOrderPage({ params }: { params: { orderCode: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderCode: params.orderCode },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order || order.paymentMethod !== 'VIETQR') notFound();

  const payment = order.payments[0] ?? await prisma.payment.create({
    data: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount },
  });
  const bankId = process.env.VIETQR_BANK_ID ?? 'MB';
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER ?? '0762793244';
  const accountName = process.env.VIETQR_ACCOUNT_NAME ?? 'TRAN TRUNG CHAU';
  const transferContent = order.orderCode;
  const qrUrl = new URL(`https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png`);
  qrUrl.searchParams.set('amount', String(order.totalAmount));
  qrUrl.searchParams.set('addInfo', transferContent);
  qrUrl.searchParams.set('accountName', accountName);
  const expiresAt = new Date(payment.createdAt.getTime() + 15 * 60 * 1000).toISOString();
  const alreadyConfirmed = order.paymentStatus === 'PAID';

  return <main className="page-shell"><header className="topbar"><div className="brand-wrap"><span className="brand-badge">M</span><div><p className="eyebrow">Mắc Khén Farm</p><h1>Thanh toán VietQR</h1></div></div><Link className="secondary-action" href="/tra-cuu">Tra cứu đơn hàng</Link></header><section className="page-card payment-page"><div className="page-title"><div><p className="eyebrow">Đơn hàng {order.orderCode}</p><h2>Quét mã để chuyển khoản</h2></div><strong className="payment-total">{formatCurrency(order.totalAmount)}</strong></div><div className="payment-qr-layout"><div className="payment-qr-panel"><img src={qrUrl.toString()} alt={`Mã VietQR thanh toán ${formatCurrency(order.totalAmount)}`} /></div><div className="payment-information"><dl><div><dt>Ngân hàng</dt><dd>{bankId === 'MB' ? 'MB Bank' : bankId}</dd></div><div><dt>Số tài khoản</dt><dd>{accountNumber}</dd></div><div><dt>Chủ tài khoản</dt><dd>{accountName}</dd></div><div><dt>Số tiền</dt><dd>{formatCurrency(order.totalAmount)}</dd></div><div><dt>Nội dung chuyển khoản</dt><dd>{transferContent}</dd></div></dl><CopyPaymentDetails accountNumber={accountNumber} transferContent={transferContent} /><PaymentConfirmation orderCode={order.orderCode} orderId={order.id} expiresAt={expiresAt} alreadyConfirmed={alreadyConfirmed} /></div></div></section></main>;
}