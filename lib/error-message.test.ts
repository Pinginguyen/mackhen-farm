import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './error-message';

describe('getErrorMessage', () => {
  it('returns string errors unchanged', () => {
    expect(getErrorMessage('Không tìm thấy đơn hàng.')).toBe('Không tìm thấy đơn hàng.');
  });

  it('extracts messages from nested API errors', () => {
    expect(getErrorMessage({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Hệ thống đang bận, vui lòng thử lại sau.' } }))
      .toBe('Hệ thống đang bận, vui lòng thử lại sau.');
  });

  it('extracts native Error messages and falls back for unknown values', () => {
    expect(getErrorMessage(new Error('Kết nối thất bại'))).toBe('Kết nối thất bại');
    expect(getErrorMessage({ code: 'UNKNOWN' }, 'Không thể xử lý')).toBe('Không thể xử lý');
  });
});