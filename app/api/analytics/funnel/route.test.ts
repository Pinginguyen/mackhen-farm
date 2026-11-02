import { beforeEach, describe, expect, it, vi } from 'vitest';

const { funnelEventCreate } = vi.hoisted(() => ({ funnelEventCreate: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { funnelEvent: { create: funnelEventCreate } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

const sessionId = '95e91a4a-9c2a-4b54-aefc-b390950e236d';

function makeRequest(body: unknown) {
  return new Request('https://mackhen.example/api/analytics/funnel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/analytics/funnel', () => {
  beforeEach(() => {
    funnelEventCreate.mockReset().mockResolvedValue({ id: 'event-1' });
  });

  it('stores a valid anonymous product-view event', async () => {
    const response = await POST(makeRequest({ eventType: 'PRODUCT_VIEW', sessionId, productId: 'product-1' }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(funnelEventCreate).toHaveBeenCalledWith({ data: { eventType: 'PRODUCT_VIEW', sessionId, productId: 'product-1' } });
  });

  it('rejects unsupported event types and malformed session identifiers', async () => {
    const response = await POST(makeRequest({ eventType: 'ORDER_PAID', sessionId: 'not-a-uuid' }));

    expect(response.status).toBe(400);
    expect(funnelEventCreate).not.toHaveBeenCalled();
  });
});