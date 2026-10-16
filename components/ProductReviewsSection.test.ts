import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ProductReviewsSection from './ProductReviewsSection';

const props = {
  productId: 'product-1',
  productName: 'Khô bò thực vật TEST2',
  initialRating: 5,
  initialReviewCount: 1,
  initialRatingCounts: [0, 0, 0, 0, 1],
  initialReviews: [{ id: 'review-1', customerName: 'Minh Anh', rating: 5, comment: 'Vị ngon, đóng gói cẩn thận', createdAt: '2026-10-15T10:00:00.000Z' }],
};

describe('ProductReviewsSection', () => {
  it('renders the rating breakdown, verified review card, and collapsed write action', () => {
    const html = renderToStaticMarkup(createElement(ProductReviewsSection, props));

    expect(html).toContain('class="reviews-layout"');
    expect(html).toContain('Dựa trên 1 lượt đánh giá từ người mua thực tế');
    expect(html).toContain('aria-label="Phân bố số sao"');
    expect(html).toContain('100%');
    expect(html).toContain('Minh Anh');
    expect(html).toContain('Đã mua hàng tại Mắc Khén Farm');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Viết đánh giá của bạn');
    expect(html).toContain('Đánh giá sản phẩm');
    expect(html).toContain('Khô bò thực vật TEST2');
    expect(html).toContain('maxLength="500"');
    expect(html).toContain('Tuyệt vời / Rất thích');
  });
});
