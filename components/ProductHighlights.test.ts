import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ProductHighlights from './ProductHighlights';

describe('ProductHighlights', () => {
  it('renders configured product bullets and fixed shop commitments', () => {
    const html = renderToStaticMarkup(createElement(ProductHighlights, { highlights: ['22g protein thực vật / 100g', 'Vị mắc khén Tây Bắc'] }));

    expect(html).toContain('Đặc điểm riêng của sản phẩm');
    expect(html).toContain('22g protein thực vật / 100g');
    expect(html).toContain('Vị mắc khén Tây Bắc');
    expect(html).toContain('Cam kết chung của Shop');
    expect(html).toContain('Đổi gói mới 0đ trong 24h');
    expect(html).toContain('Đóng gói tiêu chuẩn khử oxy');
  });

  it('omits the private highlights block when the array is empty', () => {
    const html = renderToStaticMarkup(createElement(ProductHighlights, { highlights: [] }));

    expect(html).not.toContain('Đặc điểm riêng của sản phẩm');
    expect(html).toContain('Cam kết chung của Shop');
    expect(html).toContain('Đổi gói mới 0đ trong 24h');
    expect(html).toContain('Đóng gói tiêu chuẩn khử oxy');
  });
});