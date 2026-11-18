import { describe, expect, it } from 'vitest';

import { formatCurrency, translateContent } from './translations';

describe('B2B toast translations', () => {
  it.each([
    [
      'Đã gửi yêu cầu hợp tác thành công! Đội ngũ phụ trách sẽ liên hệ qua email trong vòng 24 giờ.',
      'Your partnership inquiry was sent successfully! Our team will contact you by email within 24 hours.',
    ],
  ])('translates the B2B toast to English', (source, expected) => {
    expect(translateContent(source, 'en')).toBe(expected);
  });
});

describe('currency formatting', () => {
  it('converts integer VND into rounded SGD and USD cents', () => {
    expect(formatCurrency(18500, 'SGD')).toBe('S$ 1.00');
    expect(formatCurrency(19000, 'SGD')).toBe('S$ 1.03');
    expect(formatCurrency(1425, 'SGD')).toBe('S$ 0.08');
    expect(formatCurrency(65500, 'SGD')).toBe('S$ 3.54');
    expect(formatCurrency(25500, 'USD')).toBe('$ 1.00');
    expect(formatCurrency(19000, 'USD')).toBe('$ 0.75');
  });
});
