import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/traceability/[batchCode]', () => {
  it('normalizes the batch code and returns traceability details', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability/batch-kb-2026-01'), {
      params: { batchCode: 'batch-kb-2026-01' },
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.batchCode).toBe('BATCH-KB-2026-01');
    expect(result.data.steps).toHaveLength(4);
  });

  it('returns all four published cham cheo production steps', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability/BATCH-CC-2026-02'), {
      params: { batchCode: 'BATCH-CC-2026-02' },
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data.steps).toHaveLength(4);
    expect(result.data.steps.map((step: { detail: string }) => step.detail)).toEqual([
      'Ớt thóc tươi, tỏi nếp Điện Biên thu mua từ nông hộ Mường Phăng; Hạt mắc khén & hạt dổi rừng rang thơm từ HTX Bản Lướt, Sơn La; Muối hầm sạch.',
      'Nướng thơm tỏi ớt trên than củi, giã nhuyễn thủ công cùng hạt mắc khén và rau mùi tàu theo công thức truyền thống dân tộc Thái.',
      'Ủ cân bằng vị cay nồng tê nhẹ trong 24 giờ, chiết rót tự động vào hũ nắp nhôm 250g, dán màng seal nhiệt ngăn oxy hóa.',
      'Đạt chuẩn an toàn sinh học QCVN 8-2:2011/BYT. Không phẩm màu, không chất bảo quản nhân tạo. Phiếu kiểm nghiệm vi sinh số 28/ATTP-MKF.',
    ]);
  });

  it('returns the requested not-found response for an unknown batch', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability/unknown'), {
      params: { batchCode: 'unknown' },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: 'Mã lô không tồn tại hoặc chưa được phát hành trên hệ thống.',
    });
  });
});