import { describe, expect, it } from 'vitest';

import { formatCurrency, translateContent } from './translations';

describe('B2B toast translations', () => {
  it.each([
    [
      'Yêu cầu đã được ghi nhận. Quản lý phát triển thị trường sẽ liên hệ với bạn qua Email trong 24h.',
      'Your inquiry has been received. Our market development team will contact you by email within 24 hours.',
    ],
    [
      'Yêu cầu đã được lưu, nhưng email thông báo quản trị chưa gửi được. Vui lòng thử lại sau.',
      'Your inquiry was saved, but the admin notification email could not be sent. Please try again later.',
    ],
  ])('translates the B2B toast to English', (source, expected) => {
    expect(translateContent(source, 'en')).toBe(expected);
  });
});

describe('currency formatting', () => {
  it('converts integer VND into rounded SGD cents', () => {
    expect(formatCurrency(19000, 'SGD')).toBe('S$ 1.00');
    expect(formatCurrency(1425, 'SGD')).toBe('S$ 0.08');
    expect(formatCurrency(65500, 'SGD')).toBe('S$ 3.45');
  });
});
