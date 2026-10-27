import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function CheckoutEmptyState({ unavailable, buyNow }: { unavailable: boolean; buyNow: boolean }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  return (
    <div className="checkout-empty-state">
      <span className="checkout-empty-icon" aria-hidden="true"><ShoppingBag size={34} strokeWidth={1.7} /></span>
      <h2>{isEN ? 'Your cart is empty' : 'Giỏ hàng của bạn đang trống'}</h2>
      <p className="checkout-empty-description">{isEN ? 'It looks like you have not added any products yet. Explore our delicious Northwest specialties.' : 'Có vẻ như bạn chưa chọn sản phẩm nào để đặt hàng. Hãy dạo một vòng cửa hàng và khám phá những đặc sản sấy Tây Bắc thơm ngon nhé!'}</p>
      {unavailable && <p className="checkout-empty-notice" role="status">{isEN ? 'Your cart could not be loaded. No order was created; please try again in a few minutes.' : 'Chưa tải được giỏ hàng. Đơn chưa được tạo; hãy thử tải lại sau ít phút.'}</p>}
      {buyNow && <span className="sr-only">{isEN ? 'Your Buy Now session has no products.' : 'Phiên Mua ngay không còn sản phẩm.'}</span>}
      <Link href="/products" className="checkout-empty-cta">{isEN ? 'Continue shopping' : 'Tiếp tục mua sắm'}</Link>
      <p className="checkout-empty-secondary">{isEN ? 'Or review your ' : 'Hoặc xem lại '}<Link href="/tra-cuu-don">{isEN ? 'orders' : 'Đơn hàng đã đặt'}</Link></p>
    </div>
  );
}