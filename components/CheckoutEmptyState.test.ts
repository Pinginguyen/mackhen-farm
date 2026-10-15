import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CheckoutEmptyState from './CheckoutEmptyState';

describe('CheckoutEmptyState', () => {
  it('shows an orphan buy-now fallback and keeps order submission disabled', () => {
    const html = renderToStaticMarkup(createElement(CheckoutEmptyState, { unavailable: false, buyNow: true }));

    expect(html).toContain('Chưa có sản phẩm nào trong đơn hàng');
    expect(html).toContain('href="/products"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Không thể đặt đơn hàng trống');
  });
});