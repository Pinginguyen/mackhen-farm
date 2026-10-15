import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function CheckoutEmptyState({ unavailable, buyNow }: { unavailable: boolean; buyNow: boolean }) {
  return (
    <div className="checkout-empty-state">
      <span className="checkout-empty-icon" aria-hidden="true"><ShoppingBag size={34} strokeWidth={1.7} /></span>
      <h2>Giỏ hàng của bạn đang trống</h2>
      <p className="checkout-empty-description">Có vẻ như bạn chưa chọn sản phẩm nào để đặt hàng. Hãy dạo một vòng cửa hàng và khám phá những đặc sản sấy Tây Bắc thơm ngon nhé!</p>
      {unavailable && <p className="checkout-empty-notice" role="status">Chưa tải được giỏ hàng. Đơn chưa được tạo; hãy thử tải lại sau ít phút.</p>}
      {buyNow && <span className="sr-only">Phiên Mua ngay không còn sản phẩm.</span>}
      <Link href="/products" className="checkout-empty-cta">Tiếp tục mua sắm</Link>
      <p className="checkout-empty-secondary">Hoặc xem lại <Link href="/tra-cuu-don">Đơn hàng đã đặt</Link></p>
    </div>
  );
}