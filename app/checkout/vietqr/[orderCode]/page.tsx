import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';
import PaymentConfirmation from '../../payment/payment-confirmation';
import CopyPaymentDetails from '../copy-payment-details';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

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

  if (searchParams?.demo === '1') {
    const requestedAmount = Number(searchParams.amount);
    const demoAmount = Number.isSafeInteger(requestedAmount) && requestedAmount >= 0 ? requestedAmount : 0;
    const qrUrl = createQrUrl(bankId, accountNumber, accountName, demoAmount, params.orderCode);

    return (
      <main className="page-shell">
        <Header />
        <section className="page-card payment-page">
          <div className="page-title">
            <div><p className="eyebrow">Mã demo {params.orderCode}</p><h1>VietQR demo</h1></div>
            <strong className="payment-total">{formatCurrency(demoAmount)}</strong>
          </div>
          <p className="payment-demo-notice" role="status">Database đang tạm thời không khả dụng. Đây là mã QR demo, đơn chưa được lưu và giao dịch chuyển khoản sẽ không được hệ thống xác nhận.</p>
          <div className="payment-qr-layout">
            <div className="payment-qr-panel">
              <img src={qrUrl} alt={`Mã VietQR demo ${params.orderCode}`} />
            </div>
            <div className="payment-information">
              <dl>
                <div><dt>Ngân hàng</dt><dd>{bankId === 'MB' ? 'MB Bank' : bankId}</dd></div>
                <div><dt>Số tài khoản</dt><dd>{accountNumber}</dd></div>
                <div><dt>Chủ tài khoản</dt><dd>{accountName}</dd></div>
                <div><dt>Số tiền demo</dt><dd>{formatCurrency(demoAmount)}</dd></div>
                <div><dt>Nội dung chuyển khoản</dt><dd>{params.orderCode}</dd></div>
              </dl>
              <CopyPaymentDetails accountNumber={accountNumber} transferContent={params.orderCode} />
              <Link className="secondary-action" href="/checkout">Thử tạo đơn lại</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderCode: params.orderCode },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order || order.paymentMethod !== 'VIETQR') notFound();

  const payment = order.payments[0] ?? await prisma.payment.create({
    data: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount },
  });
  const transferContent = order.orderCode;
  const qrUrl = createQrUrl(bankId, accountNumber, accountName, order.totalAmount, transferContent);
  const expiresAt = new Date(payment.createdAt.getTime() + 15 * 60 * 1000).toISOString();
  const alreadyConfirmed = order.paymentStatus === 'PAID';

  return <main className="page-shell"><Header /><section className="page-card payment-page"><div className="page-title"><div><p className="eyebrow">Đơn hàng {order.orderCode}</p><h2>Quét mã để chuyển khoản</h2></div><strong className="payment-total">{formatCurrency(order.totalAmount)}</strong></div><div className="payment-qr-layout"><div className="payment-qr-panel"><img src={qrUrl} alt={`Mã VietQR thanh toán ${formatCurrency(order.totalAmount)}`} /></div><div className="payment-information"><dl><div><dt>Ngân hàng</dt><dd>{bankId === 'MB' ? 'MB Bank' : bankId}</dd></div><div><dt>Số tài khoản</dt><dd>{accountNumber}</dd></div><div><dt>Chủ tài khoản</dt><dd>{accountName}</dd></div><div><dt>Số tiền</dt><dd>{formatCurrency(order.totalAmount)}</dd></div><div><dt>Nội dung chuyển khoản</dt><dd>{transferContent}</dd></div></dl><CopyPaymentDetails accountNumber={accountNumber} transferContent={transferContent} /><PaymentConfirmation orderCode={order.orderCode} orderId={order.id} expiresAt={expiresAt} alreadyConfirmed={alreadyConfirmed} paymentMethod="VIETQR" /></div></div></section></main>;
}