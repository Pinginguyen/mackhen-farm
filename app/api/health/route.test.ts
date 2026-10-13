import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';

describe('health route', () => {
  beforeEach(() => vi.mocked(prisma.$queryRaw).mockResolvedValue([]));

  it('returns healthy app status when the database responds', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      status: 'ok',
      services: {
        database: 'healthy',
      },
    });
  });
});
