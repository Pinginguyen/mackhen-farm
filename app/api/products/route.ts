import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export function GET() {
  return withDatabase(async () => {
    const databaseProducts = await prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
    const products = databaseProducts.length
      ? databaseProducts
      : DEFAULT_PRODUCTS.map((product) => ({ ...product, variants: [] }));
    const categories = [...new Set(products.map((product) => product.category))];

    return NextResponse.json({
      items: products.map((product) => ({
        ...product,
        status: product.stock < 30 ? 'Sắp hết' : 'Còn hàng',
        variants: product.variants.map((variant) => ({
          ...variant,
          status: variant.stock < 30 ? 'Sắp hết' : 'Còn hàng',
        })),
      })),
      pagination: { page: 1, limit: 10, total: products.length },
      filters: { categories },
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeHighlights(value: unknown): string[] | null {
  if (value === undefined) return [];
  const lines = typeof value === 'string'
    ? value.split(/\r?\n/)
    : Array.isArray(value) && value.every((line) => typeof line === 'string')
      ? value
      : null;
  if (!lines) return null;
  const highlights = lines.map((line) => line.trim()).filter(Boolean);
  if (highlights.length > 12 || highlights.some((line) => line.length > 160)) return null;
  return highlights;
}

function createSlug(name: string): string {
  const slug = name.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'san-pham';
  return `${slug}-${randomUUID().slice(0, 8)}`;
}

function normalizeCategory(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (['Khô bò thực vật', 'Khô chay Tây Bắc'].includes(value.trim())) return 'Khô chay Tây Bắc';
  if (['Gia vị', 'Gia vị Tây Bắc'].includes(value.trim())) return 'Gia vị Tây Bắc';
  return null;
}

function normalizeImage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return '/products/xe-soi.jpg';
  if (typeof value !== 'string') return null;
  if (value.startsWith('data:')) {
    return value.length <= 2_800_000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
      ? value
      : null;
  }
  if (value.length > 2048) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu sản phẩm không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: { message: 'Dữ liệu sản phẩm không hợp lệ.' } }, { status: 400 });

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = numberValue(body.price);
  const originalPrice = body.originalPrice == null || body.originalPrice === '' ? null : numberValue(body.originalPrice);
  const weightInput = typeof body.weight === 'string' || typeof body.weight === 'number' ? String(body.weight).trim() : '150g';
  const weightMatch = weightInput.match(/^(\d+)\s*(?:g|gram)?$/i);
  const weight = weightMatch ? Number(weightMatch[1]) : null;
  const protein = typeof body.protein === 'string' ? body.protein.trim().replace(/\s+protein$/i, '') : '';
  const category = normalizeCategory(body.category);
  const description = typeof body.description === 'string' ? body.description.trim() : typeof body.desc === 'string' ? body.desc.trim() : '';
  const image = normalizeImage(body.imageUrl ?? body.image);
  const stock = numberValue(body.stock ?? 0);
  const highlights = normalizeHighlights(body.highlights);

  if (!name || name.length > 160 || price === null || price <= 0 || (originalPrice !== null && (originalPrice < price || originalPrice < 0))
    || weight === null || weight <= 0 || (!protein && category !== 'Gia vị Tây Bắc') || protein.length > 80 || !category || description.length > 2000
    || !image || stock === null || stock < 0 || stock > 1000000 || highlights === null) {
    return NextResponse.json({ error: { message: 'Vui lòng kiểm tra tên, danh mục, giá, khối lượng, tồn kho và mô tả sản phẩm.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const product = await prisma.product.create({
      data: {
        slug: createSlug(name),
        name,
        category,
        price,
        originalPrice,
        unit: `${weight}g`,
        weight,
        protein: protein || null,
        calories: null,
        images: [image],
        rating: 0,
        stock,
        description,
        image,
        highlights,
        highlight: typeof body.highlight === 'string' && body.highlight.trim() ? body.highlight.trim().slice(0, 40) : 'Sản phẩm mới',
        active: true,
      } satisfies Prisma.ProductCreateInput,
    });
    return NextResponse.json({ product }, { status: 201 });
  }, 'Admin product creation failed');
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu sản phẩm không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.id !== 'string' || !body.id.trim()) {
    return NextResponse.json({ error: { message: 'Không tìm thấy sản phẩm cần chỉnh sửa.' } }, { status: 400 });
  }
  const productId = body.id.trim();

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = numberValue(body.price);
  const originalPrice = body.originalPrice == null || body.originalPrice === '' ? null : numberValue(body.originalPrice);
  const weightInput = typeof body.weight === 'string' || typeof body.weight === 'number' ? String(body.weight).trim() : '150g';
  const weightMatch = weightInput.match(/^(\d+)\s*(?:g|gram)?$/i);
  const weight = weightMatch ? Number(weightMatch[1]) : null;
  const protein = typeof body.protein === 'string' ? body.protein.trim().replace(/\s+protein$/i, '') : '';
  const category = normalizeCategory(body.category);
  const description = typeof body.description === 'string' ? body.description.trim() : typeof body.desc === 'string' ? body.desc.trim() : '';
  const image = normalizeImage(body.imageUrl ?? body.image);
  const stock = numberValue(body.stock ?? 0);
  const highlights = body.highlights === undefined ? undefined : normalizeHighlights(body.highlights);

  if (!name || name.length > 160 || price === null || price <= 0 || (originalPrice !== null && (originalPrice < price || originalPrice < 0))
    || weight === null || weight <= 0 || (!protein && category !== 'Gia vị Tây Bắc') || protein.length > 80 || !category || description.length > 2000
    || !image || stock === null || stock < 0 || stock > 1000000 || highlights === null) {
    return NextResponse.json({ error: { message: 'Vui lòng kiểm tra tên, danh mục, giá, khối lượng, tồn kho và mô tả sản phẩm.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const previous = await prisma.product.findUnique({ where: { id: productId }, select: { price: true, stock: true, active: true } });
    if (!previous) return NextResponse.json({ error: { message: 'Không tìm thấy sản phẩm.' } }, { status: 404 });
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        category,
        price,
        originalPrice,
        unit: `${weight}g`,
        weight,
        protein: protein || null,
        stock,
        description,
        image,
        images: [image],
        ...(highlights === undefined ? {} : { highlights }),
      },
      include: { variants: true },
    });
    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: previous.price !== product.price ? 'UPDATE_PRICE' : 'ADJUST_STOCK',
      targetEntity: 'Product',
      targetId: product.id,
      oldValue: previous,
      newValue: { price: product.price, stock: product.stock, active: product.active },
    });
    return NextResponse.json({ product });
  }, 'Admin product update failed');
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const productId = new URL(request.url).searchParams.get('id')?.trim();
  if (!productId || productId.length > 128) {
    return NextResponse.json({ success: false, message: 'Mã sản phẩm không hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const result = await prisma.product.updateMany({
      where: { id: productId, active: true },
      data: { active: false },
    });
    if (!result.count) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy sản phẩm cần xóa.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Đã xóa sản phẩm thành công.' });
  }, 'Admin product deletion failed');
}
