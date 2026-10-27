'use client';

import { formatApproxVnd } from '@/lib/translations';
import { useLocaleCurrency } from '@/lib/i18n-context';

type SummaryItem = { id: string; name: string; quantity: number; total: number };

export default function CheckoutOrderSummary({ items, shipping, total, freeShippingApplied }: {
  items: SummaryItem[];
  shipping: number;
  total: number;
  freeShippingApplied: boolean;
}) {
  const { locale, currency, formatCurrency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';

  return (
    <>
      <h3>{isEN ? 'Order summary' : 'Đơn hàng'}</h3>
      <div className="summary-list">
        {items.map((item) => <div className="item" key={item.id}><span>{item.name} x{item.quantity}</span><strong>{formatCurrency(item.total)}</strong></div>)}
        <div className="item"><span>{isEN ? 'Shipping' : 'Vận chuyển'}</span><strong>{freeShippingApplied ? <><del>{formatCurrency(35000)}</del> {formatCurrency(0)}</> : shipping === 0 ? (isEN ? `Free · ${formatCurrency(0)}` : `Miễn phí · ${formatCurrency(0)}`) : formatCurrency(shipping)}</strong></div>
        <div className="item"><span>{isEN ? 'Total before discount' : 'Tạm tính trước mã giảm giá'}</span><strong>{formatCurrency(total)}{currency === 'SGD' && <> ({formatApproxVnd(total)})</>}</strong></div>
      </div>
      {currency === 'SGD' && <p className="checkout-cross-border-notice">{isEN ? 'Converted at the interbank exchange rate' : 'Thanh toán quy đổi theo tỷ giá liên ngân hàng'}</p>}
    </>
  );
}