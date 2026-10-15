import React from 'react';
import Link from 'next/link';

export default function CheckoutEmptyState({ unavailable, buyNow }: { unavailable: boolean; buyNow: boolean }) {
  return (
    <div className="checkout-empty-state">
      <p className={unavailable ? 'checkout-service-notice' : 'empty-state'} role="status">
        {unavailable
          ? 'Chưa tải được giỏ hàng. Đơn chưa được tạo; hãy thử tải lại sau ít phút.'
          : buyNow
            ? 'Chưa có sản phẩm nào trong đơn hàng. Phiên Mua ngay không còn dữ liệu; vui lòng quay lại chọn sản phẩm.'
            : 'Giỏ hàng hiện chưa có sản phẩm nên chưa thể tạo đơn.'}
      </p>
      <div className="cart-footer">
        <Link href="/products" className="primary-action">Quay lại mua sắm</Link>
        <Link href="/cart" className="secondary-action">Mở giỏ hàng</Link>
        <Link href="/tra-cuu" className="secondary-action">Tra cứu đơn hàng</Link>
      </div>
      <button className="primary-action" type="button" disabled aria-disabled="true">Không thể đặt đơn hàng trống</button>
    </div>
  );
}