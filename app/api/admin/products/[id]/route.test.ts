import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateProduct } = vi.hoisted(() => ({ updateProduct: vi.fn() }));

vi.mock('@/app/api/products/route', () => ({ PATCH: updateProduct }));

import { PATCH } from './route';

describe('PATCH /api/admin/products/[id]', () => {
  beforeEach(() => updateProduct.mockReset());

  it('uses the route product ID rather than a client-provided ID', async () => {
    updateProduct.mockResolvedValue(Response.json({ product: { id: 'product-1' } }));
    const response = await PATCH(new Request('https://mackhen.example/api/admin/products/product-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'another-product', name: 'Sản phẩm' }),
    }), { params: { id: 'product-1' } });

    expect(response.status).toBe(200);
    expect(await updateProduct.mock.calls[0][0].json()).toEqual({ id: 'product-1', name: 'Sản phẩm' });
  });

  it('rejects non-object request bodies', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/products/product-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([]),
    }), { params: { id: 'product-1' } });

    expect(response.status).toBe(400);
    expect(updateProduct).not.toHaveBeenCalled();
  });
});