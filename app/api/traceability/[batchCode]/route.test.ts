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