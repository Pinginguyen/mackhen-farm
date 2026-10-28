'use client';

import Image from 'next/image';
import { useLocaleCurrency } from '@/lib/i18n-context';
import PaymentConfirmation from '../../payment/payment-confirmation';
import CopyPaymentDetails from '../copy-payment-details';
import PaymentStatusPoller from './payment-status-poller';

type PaymentItem = { productId: string; productName: string; variantLabel: string | null; quantity: number; price: number };

export default function VietQrPaymentDetails({
  orderCode,
  amount,
  bankId,
  accountNumber,
  accountName,
  qrUrl,
  orderId,
  createdAt,
  items,
  expiresAt,
  alreadyConfirmed,
  isLocalOnly,
}: {
  orderCode: string;
  amount: number;
  bankId: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
  orderId?: string;
  createdAt: string;
  items: PaymentItem[];
  expiresAt: string;
  alreadyConfirmed: boolean;
  isLocalOnly: boolean;
}) {
  const { locale, currency, formatCurrency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const amountLabel = formatCurrency(amount);

  return (
    <>
      <div className="page-title">
        <div><p className="eyebrow">{isEN ? 'Order' : 'Đơn hàng'} {orderCode}</p><h1>{isEN ? 'Scan to pay by bank transfer' : 'Quét mã để chuyển khoản'}</h1></div>
        <strong className="payment-total">{amountLabel}</strong>
      </div>
      {isLocalOnly && <p className="payment-order-unavailable" role="status">{isEN ? 'This order has not been saved or verified online. These details are for reference only; contact the store to confirm before transferring funds.' : 'Đơn chưa được lưu hoặc xác minh trực tuyến. Thông tin này chỉ để tra cứu; vui lòng liên hệ cửa hàng để đối soát trước khi chuyển khoản.'}</p>}
      <PaymentStatusPoller orderCode={orderCode} orderId={orderId ?? orderCode} canPoll={Boolean(orderId)} initiallyPaid={alreadyConfirmed}>
        <div className="relative isolate overflow-hidden rounded-2xl p-px">
          <div aria-hidden="true" className="pointer-events-none absolute inset-[-100%] animate-border-beam bg-[conic-gradient(transparent_0deg,#9B2424_70deg,transparent_130deg)] motion-reduce:animate-none" />
          <div className="payment-qr-panel relative z-10 border-0"><Image src={qrUrl} alt={isEN ? `VietQR payment code for ${amountLabel}` : `Mã VietQR thanh toán ${amountLabel}`} width={520} height={520} sizes="(max-width: 768px) 90vw, 520px" unoptimized /></div>
        </div>
        <div className="payment-information">
          <dl>
            <div><dt>{isEN ? 'Bank' : 'Ngân hàng'}</dt><dd>{bankId === 'MB' ? 'MB Bank' : bankId}</dd></div>
            <div><dt>{isEN ? 'Account number' : 'Số tài khoản'}</dt><dd>{accountNumber}</dd></div>
            <div><dt>{isEN ? 'Account holder' : 'Chủ tài khoản'}</dt><dd>{accountName}</dd></div>
            <div><dt>{isEN ? 'Amount' : 'Số tiền'}</dt><dd>{amountLabel}</dd></div>
            <div><dt>{isEN ? 'Transfer reference' : 'Nội dung chuyển khoản'}</dt><dd>{orderCode}</dd></div>
          </dl>
          <CopyPaymentDetails accountNumber={accountNumber} transferContent={orderCode} />
          <PaymentConfirmation
            orderId={orderId}
            orderCode={orderCode}
            totalAmount={amount}
            createdAt={createdAt}
            items={items}
            expiresAt={expiresAt}
            alreadyConfirmed={alreadyConfirmed}
            paymentMethod="VIETQR"
            isLocalOnly={isLocalOnly}
          />
        </div>
      </PaymentStatusPoller>
    </>
  );
}