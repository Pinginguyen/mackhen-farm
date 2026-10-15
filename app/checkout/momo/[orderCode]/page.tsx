import { notFound } from 'next/navigation';
import Image from 'next/image';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';
import CopyPaymentDetails from '../../vietqr/copy-payment-details';
import MomoPaymentActions from './payment-actions';

export const dynamic = 'force-dynamic';

const fallbackAmount = 155000;
const momoPhone = '0762793244';
const momoAccountName = 'TRAN TRUNG CHAU';

type MomoOrder = {
  paymentMethod: string;
  totalAmount: number;
};

export default async function MomoPaymentPage({
  params,
  searchParams,
}: {
  params: { orderCode: string };
  searchParams?: { amount?: string };
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
      select: { paymentMethod: true, totalAmount: true },
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
  const isLocalOnly = !order;

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

        <div className="momo-payment-layout">
          <div className="momo-qr-card">
            <Image src="/products/momo-qr.jpg" alt="Mã QR MoMo chính chủ của TRAN TRUNG CHAU" width={420} height={420} sizes="(max-width: 768px) 90vw, 420px" />
            <span className="momo-qr-caption"><span className="momo-brand-mark small" aria-hidden="true">M</span> Quét bằng Ví MoMo</span>
          </div>

          <div className="momo-payment-details">
            <h2>Thông tin giao dịch</h2>
            <dl>
              <div><dt>Tên người thụ hưởng</dt><dd>{momoAccountName}</dd></div>
              <div><dt>Số tiền cần chuyển</dt><dd className="momo-amount">{amount.toLocaleString('vi-VN')}đ</dd></div>
              <div><dt>Nội dung chuyển tiền</dt><dd>{orderCode}</dd></div>
            </dl>
            <CopyPaymentDetails accountNumber={momoPhone} transferContent={orderCode} />
            <ol className="momo-payment-steps">
              <li><span>1</span><p>Mở ứng dụng MoMo trên điện thoại.</p></li>
              <li><span>2</span><p>Chọn “Quét Mã” và hướng camera vào mã QR bên cạnh.</p></li>
              <li><span>3</span><p>Nhập đúng số tiền và nội dung đơn hàng rồi bấm “Xác nhận”.</p></li>
            </ol>
            {isLocalOnly && <p className="momo-pending-note" role="status">Đơn đang chờ hệ thống xác minh. Vui lòng giữ lại biên nhận giao dịch để đối soát.</p>}
            <MomoPaymentActions orderCode={orderCode} />
          </div>
        </div>
      </section>
    </main>
  );
}