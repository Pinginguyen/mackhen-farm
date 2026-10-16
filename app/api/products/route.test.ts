import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productFindMany, productFindUnique, productCreate, productUpdate, productUpdateMany, auditLogCreate, requireAdmin } = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  productFindUnique: vi.fn(),
  productCreate: vi.fn(),
  productUpdate: vi.fn(),
  productUpdateMany: vi.fn(),
  auditLogCreate: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { product: { findMany: productFindMany, findUnique: productFindUnique, create: productCreate, update: productUpdate, updateMany: productUpdateMany }, auditLog: { create: auditLogCreate } } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { DELETE, GET, PATCH, POST } from './route';

function makeRequest(method: string, body?: unknown) {
  return new Request('https://mackhen.example/api/products', {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const validProduct = {
  name: 'Khô Mắc Khén phiên bản mới',
  price: 99000,
  originalPrice: 119000,
  weight: '180g',
  protein: '22g/100g Protein',
  category: 'Khô bò thực vật',
  description: 'Mô tả sản phẩm mới.',
  ingredients: 'Bã đậu nành upcycled, mắc khén và hạt dổi.',
  imageUrl: '/products/xe-soi.jpg',
  stock: 15,
  badge: 'Bán chạy',
  nutritionFacts: { enabled: true, servingSize: 'Trên 100g', calories: '320 kcal', protein: '22g', fat: '2.5g', cholesterol: '0 mg', fiber: '4g', carbohydrates: '15g', sodium: '420 mg' },
};

describe('/api/products', () => {
  beforeEach(() => {
    productFindMany.mockReset().mockResolvedValue([]);
    productFindUnique.mockReset().mockResolvedValue({ id: 'product-1', price: 89000, stock: 10, active: true });
    productCreate.mockReset().mockResolvedValue({ id: 'product-1', ...validProduct });
    productUpdate.mockReset().mockResolvedValue({ id: 'product-1', ...validProduct });
    productUpdateMany.mockReset();
    auditLogCreate.mockReset().mockResolvedValue({ id: 'audit-1' });
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('returns the complete default catalog when the database catalog is empty', async () => {
    const response = await GET();
    const result = await response.json() as { items: { id: string; slug: string; ingredients: string }[]; pagination: { total: number } };

    expect(response.status).toBe(200);
    expect(result.items).toHaveLength(8);
    expect(result.pagination.total).toBe(8);
    expect(result.items[0].slug).toBe('mac-khen-xe-soi-cay-nong');
    expect(result.items.some((product) => product.slug === 'cham-cheo-uot-chuan-vi-dien-bien')).toBe(true);
    expect(result.items.find((product) => product.slug === 'mac-khen-xe-soi-cay-nong')?.ingredients).toContain('Bã đậu nành upcycled');
    expect(result.items.find((product) => product.slug === 'cham-cheo-uot-chuan-vi-dien-bien')?.ingredients).toContain('Ớt tươi Điện Biên');
    expect(result.items.find((product) => product.slug === 'hat-mac-khen-rung-sao-kho-son-la')?.ingredients).toContain('sàng lọc sạch cuống');
  });

  it('returns active products from the database when available', async () => {
    productFindMany.mockResolvedValue([{ id: 'db-1', slug: 'db-product', category: 'Gia vị Tây Bắc', stock: 2, variants: [] }]);
    const response = await GET();
    const result = await response.json() as { items: { id: string; status: string }[] };

    expect(response.status).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'db-1', status: 'Sắp hết' });
  });

  it('requires an admin to create a product', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 403 }));
    const response = await POST(makeRequest('POST', validProduct));

    expect(response.status).toBe(403);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('requires an admin to edit a product', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 403 }));
    const response = await PATCH(makeRequest('PATCH', { id: 'product-1', ...validProduct }));

    expect(response.status).toBe(403);
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it('requires an admin to delete a product', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 403 }));
    const response = await DELETE(new Request('https://mackhen.example/api/products?id=product-1', { method: 'DELETE' }));

    expect(response.status).toBe(403);
    expect(productUpdateMany).not.toHaveBeenCalled();
  });

  it('soft-deletes an active product for an admin', async () => {
    productUpdateMany.mockResolvedValue({ count: 1 });
    const response = await DELETE(new Request('https://mackhen.example/api/products?id=product-1', { method: 'DELETE' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: 'Đã xóa sản phẩm thành công.' });
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: 'product-1', active: true },
      data: { active: false },
    });
  });

  it('rejects a delete request without a product id', async () => {
    const response = await DELETE(new Request('https://mackhen.example/api/products', { method: 'DELETE' }));

    expect(response.status).toBe(400);
    expect(productUpdateMany).not.toHaveBeenCalled();
  });

  it('updates product data and a base64 image with normalized numeric values', async () => {
    const imageUrl = 'data:image/webp;base64,aGVsbG8=';
    const response = await PATCH(makeRequest('PATCH', {
      id: 'product-1',
      ...validProduct,
      price: '99000',
      stock: '8',
      imageUrl,
    }));

    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: expect.objectContaining({ price: 99000, stock: 8, image: imageUrl, images: [imageUrl], badge: validProduct.badge, nutritionFacts: validProduct.nutritionFacts, ingredients: validProduct.ingredients }),
      include: { variants: true },
    });
  });

  it('creates a product with normalized schema fields for an admin', async () => {
    const response = await POST(makeRequest('POST', validProduct));
    const result = await response.json() as { product: { id: string } };

    expect(response.status).toBe(201);
    expect(result.product.id).toBe('product-1');
    expect(productCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: validProduct.name,
        category: 'Khô chay Tây Bắc',
        price: 99000,
        originalPrice: 119000,
        unit: '180g',
        weight: 180,
        protein: '22g/100g',
        stock: 15,
        description: validProduct.description,
        ingredients: validProduct.ingredients,
        image: validProduct.imageUrl,
        images: [validProduct.imageUrl],
        badge: validProduct.badge,
        nutritionFacts: validProduct.nutritionFacts,
        active: true,
      }),
    });
  });

  it('allows the optional badge to be left blank', async () => {
    const response = await POST(makeRequest('POST', { ...validProduct, badge: '  ' }));

    expect(response.status).toBe(201);
    expect(productCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ badge: null }) });
  });

  it('allows ingredients to be cleared and normalizes whitespace', async () => {
    const cleared = await POST(makeRequest('POST', { ...validProduct, ingredients: '  ' }));
    expect(cleared.status).toBe(201);
    expect(productCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ ingredients: null }) });

    await PATCH(makeRequest('PATCH', { id: 'product-1', ...validProduct, ingredients: '  Ớt tươi Điện Biên  ' }));
    expect(productUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ingredients: 'Ớt tươi Điện Biên' }),
    }));
  });

  it('accepts a supported base64 image uploaded from the admin form', async () => {
    const imageUrl = 'data:image/png;base64,aGVsbG8=';
    const response = await POST(makeRequest('POST', { ...validProduct, imageUrl }));

    expect(response.status).toBe(201);
    expect(productCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ image: imageUrl, images: [imageUrl] }),
    });
  });

  it('rejects uploaded images larger than 5 MB', async () => {
    const imageUrl = `data:image/png;base64,${'A'.repeat(7_000_000)}`;
    const response = await POST(makeRequest('POST', { ...validProduct, imageUrl }));

    expect(response.status).toBe(400);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('accepts a seasoning product without protein and with a short description', async () => {
    const response = await POST(makeRequest('POST', {
      ...validProduct,
      category: 'Gia vị',
      protein: '',
      description: 'Gia vị rừng.',
    }));

    expect(response.status).toBe(201);
    expect(productCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: 'Gia vị Tây Bắc', protein: null, description: 'Gia vị rừng.' }),
    });
  });

  it('rejects invalid prices and unsafe image URLs', async () => {
    const invalidPrice = await POST(makeRequest('POST', { ...validProduct, price: -1 }));
    const unsafeImage = await POST(makeRequest('POST', { ...validProduct, imageUrl: 'javascript:alert(1)' }));
    const unsupportedDataImage = await POST(makeRequest('POST', { ...validProduct, imageUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    const invalidNutrition = await POST(makeRequest('POST', { ...validProduct, nutritionFacts: { enabled: true, calories: { raw: '320' } } }));
    const invalidIngredients = await POST(makeRequest('POST', { ...validProduct, ingredients: 'x'.repeat(5001) }));
    const invalidIngredientsType = await PATCH(makeRequest('PATCH', { id: 'product-1', ...validProduct, ingredients: { value: 'not text' } }));

    expect(invalidPrice.status).toBe(400);
    expect(unsafeImage.status).toBe(400);
    expect(unsupportedDataImage.status).toBe(400);
    expect(invalidNutrition.status).toBe(400);
    expect(invalidIngredients.status).toBe(400);
    expect(invalidIngredientsType.status).toBe(400);
    expect(productCreate).not.toHaveBeenCalled();
  });
});