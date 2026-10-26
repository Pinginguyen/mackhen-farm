import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRaw, userCount, productCount, prisma } = vi.hoisted(() => {
  const queryRaw = vi.fn();
  const userCount = vi.fn();
  const productCount = vi.fn();
  return {
    queryRaw,
    userCount,
    productCount,
    prisma: {
      $queryRaw: queryRaw,
      user: { count: userCount },
      product: { count: productCount },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

describe('GET /api/diag', () => {
  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    userCount.mockReset().mockResolvedValue(1);
    productCount.mockReset().mockResolvedValue(8);
  });

  it('reports connection and record counts', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      db: 'connected',
      users: 1,
      products: 8,
      nodeEnv: process.env.NODE_ENV,
    });
  });

  it('reports a sanitized database failure and error code', async () => {
    queryRaw.mockRejectedValueOnce(Object.assign(new Error('private connection details'), { code: 'P1001' }));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      db: 'failed',
      error: 'Database connection failed',
      code: 'P1001',
    });
  });
});