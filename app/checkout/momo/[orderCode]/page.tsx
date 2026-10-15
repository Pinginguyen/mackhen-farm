import { notFound } from 'next/navigation';
import Image from 'next/image';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';
import CopyPaymentDetails from '../../vietqr/copy-payment-details';
import PaymentStatusPoller from '../../vietqr/[orderCode]/payment-status-poller';

export const dynamic = 'force-dynamic';

const fallbackAmount = 155000;
const momoPhone = '0762793244';
const momoAccountName = 'TRAN TRUNG CHAU';

type MomoOrder = {
  id: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
};

export default async function MomoPaymentPage({
  params,
  searchParams,
}: {
  params: { orderCode: string };
  searchParams?: { amount?: string; mode?: string; resultCode?: string; message?: string };
}) {
  const orderCode = params.orderCode.trim().toUpperCase();
  if (!/^MKF-\d{6}$/.test(orderCode)) notFound();

  const requestedAmount = Number(searchParams?.amount);
  const queryAmount = Number.isSafeInteger(requestedAmount) && requestedAmount > 0 ? requestedAmount : fallbackAmount;
  let order: MomoOrder | null = null;
  let invalidPaymentMethod = false;

  try {
    const foundOrder = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true, paymentMethod: true, paymentStatus: true, totalAmount: true },
    });

    if (foundOrder && foundOrder.paymentMethod !== 'MOMO') {
      invalidPaymentMethod = true;
    } else if (foundOrder) {
      order = foundOrder;
    }
  } catch (error) {
    console.error('Unable to load MoMo order; rendering pending sandbox payment.', error instanceof Error ? error.name : 'UnknownError');
  }
  if (invalidPaymentMethod) notFound();

  const amount = order?.totalAmount ?? queryAmount;
  const paymentComplete = order?.paymentStatus === 'PAID';
  const qrUrl = new URL('https://img.vietqr.io/image/MB-0762793244-compact2.png');
  qrUrl.searchParams.set('amount', String(amount));
  qrUrl.searchParams.set('addInfo', orderCode);
  qrUrl.searchParams.set('accountName', momoAccountName);

  return (
    <main className="page-shell">
      <section className="page-card momo-payment-page">
        <header className="momo-payment-brand">
          <span className="momo-brand-mark" aria-hidden="true">M</span>
          <span className="momo-brand-copy">
            <h1>Thanh toán qua Ví điện tử MoMo</h1>
            <small>Chuyển khoản trực tiếp đến chủ tài khoản</small>
          </span>
        </header>

        <div className="momo-order-summary">
          <div><span>ĐƠN HÀNG</span><strong>{orderCode}</strong></div>
          <div><span>SỐ TIỀN</span><strong>{formatCurrency(amount)}</strong></div>
        </div>

        <PaymentStatusPoller orderCode={orderCode} orderId={order?.id ?? orderCode} initiallyPaid={paymentComplete}>
          <div className="momo-payment-layout">
            <div className="momo-qr-card">
              <Image src={qrUrl.toString()} alt={`Mã QR chuyển khoản ${formatCurrency(amount)} cho đơn ${orderCode}`} width={420} height={420} sizes="(max-width: 768px) 90vw, 420px" unoptimized />
              <span className="momo-qr-caption"><span className="momo-brand-mark small" aria-hidden="true">M</span> QR chuyển khoản MB Bank</span>
            </div>

            <div className="momo-payment-details">
              <h2>Thanh toán tự động</h2>
              <p className="momo-scan-instructions">Mở ứng dụng MoMo hoặc App Ngân hàng <span aria-hidden="true">→</span> Chọn Quét mã <span aria-hidden="true">→</span> Số tiền và nội dung sẽ tự động điền 100%.</p>
              <dl>
                <div><dt>Ngân hàng</dt><dd>MB Bank</dd></div>
                <div><dt>Số tài khoản</dt><dd>{momoPhone}</dd></div>
                <div><dt>Tên người thụ hưởng</dt><dd>{momoAccountName}</dd></div>
                <div><dt>Số tiền cần chuyển</dt><dd className="momo-amount">{amount.toLocaleString('vi-VN')}đ</dd></div>
                <div><dt>Nội dung chuyển tiền</dt><dd>{orderCode}</dd></div>
              </dl>
              <CopyPaymentDetails accountNumber={momoPhone} transferContent={orderCode} />
              <p className="momo-pending-note" role="status">Hệ thống tự động kiểm tra thanh toán mỗi 2 giây và sẽ chuyển trang ngay khi nhận được tiền.</p>
            </div>
          </div>
        </PaymentStatusPoller>
      </section>
    </main>
  );
}