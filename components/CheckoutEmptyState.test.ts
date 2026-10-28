import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CheckoutEmptyState from './CheckoutEmptyState';

describe('CheckoutEmptyState', () => {
  it('renders a centered empty state with one shopping action and order lookup link', () => {
    const html = renderToStaticMarkup(createElement(CheckoutEmptyState, { unavailable: false, buyNow: true }));

    expect(html).toContain('Giỏ hàng của bạn đang trống');
    expect(html).toContain('đặc sản sấy Tây Bắc thơm ngon');
    expect(html).toContain('href="/products"');
    expect(html).toContain('Quay lại mua sắm');
    expect(html).toContain('href="/tra-cuu-don"');
    expect(html).not.toContain('Không thể đặt đơn hàng trống');
    expect(html).not.toContain('Mở giỏ hàng');
  });
});