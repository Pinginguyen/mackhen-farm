import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { Prisma } from '@prisma/client';

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
          label: variant.title,
          stock: variant.inventory,
          status: variant.inventory < 30 ? 'Sắp hết' : 'Còn hàng',
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
    const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    const encoded = match?.[2] ?? '';
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    const bytes = encoded ? Math.floor(encoded.length * 3 / 4) - padding : Infinity;
    return encoded && encoded.length % 4 === 0 && bytes <= 5 * 1024 * 1024 ? value : null;
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

function normalizeBadge(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 60) return null;
  return value.trim() || null;
}

function normalizeNutritionFacts(value: unknown): Prisma.InputJsonValue | null {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') return null;
  const fields = ['servingSize', 'calories', 'protein', 'fat', 'cholesterol', 'fiber', 'carbohydrates', 'sodium'] as const;
  if (fields.some((field) => typeof value[field] !== 'string' || (value[field] as string).length > 80)) return null;
  return Object.fromEntries([['enabled', value.enabled], ...fields.map((field) => [field, (value[field] as string).trim()])]);
}

type VariantInput = {
  id?: string;
  title: string;
  price: number;
  originalPrice: number | null;
  weight: string;
  inventory: number;
  sku: string | null;
};

function parseVariants(value: unknown): VariantInput[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  const variants: VariantInput[] = [];

  for (const item of value) {
    if (!isRecord(item)) return null;
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : undefined;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const price = numberValue(item.price);
    const originalPrice = item.originalPrice == null || item.originalPrice === '' ? null : numberValue(item.originalPrice);
    const weight = typeof item.weight === 'string' ? item.weight.trim() : '';
    const inventory = numberValue(item.inventory);
    const sku = typeof item.sku === 'string' ? item.sku.trim().toUpperCase() || null : null;

    if ((item.id !== undefined && !id) || !title || title.length > 120 || price === null || price <= 0
      || (item.originalPrice != null && item.originalPrice !== '' && (originalPrice === null || originalPrice < price))
      || !weight || weight.length > 40 || inventory === null || inventory < 0 || inventory > 1_000_000
      || (typeof item.sku !== 'undefined' && (typeof item.sku !== 'string' || item.sku.trim().length > 80))) return null;

    variants.push({ ...(id ? { id } : {}), title, price, originalPrice, weight, inventory, sku });
  }

  const titles = variants.map((variant) => variant.title.toLocaleLowerCase('vi'));
  const skus = variants.flatMap((variant) => variant.sku ? [variant.sku] : []);
  if (new Set(titles).size !== titles.length || new Set(skus).size !== skus.length) return null;
  if (variants.reduce((sum, variant) => sum + variant.inventory, 0) > 1_000_000) return null;
  return variants;
}

function variantFields({ title, price, originalPrice, weight, inventory, sku }: VariantInput) {
  return { title, price, originalPrice, weight, inventory, sku };
}

function syncVariants(variants: VariantInput[]) {
  const ids = variants.flatMap((variant) => variant.id ? [variant.id] : []);
  return {
    deleteMany: ids.length ? { id: { notIn: ids } } : {},
    create: variants.filter((variant) => !variant.id).map(variantFields),
    upsert: variants.filter((variant) => variant.id).map((variant) => ({
      where: { id: variant.id! },
      update: variantFields(variant),
      create: variantFields(variant),
    })),
  };
}

function productVariantDefaults(variants: VariantInput[] | null, fallback: { price: number | null; originalPrice: number | null; stock: number | null; weight: string }) {
  if (!variants?.length) return fallback;
  const lowestPriceVariant = variants.reduce((lowest, variant) => variant.price < lowest.price ? variant : lowest);
  return {
    price: lowestPriceVariant.price,
    originalPrice: lowestPriceVariant.originalPrice,
    stock: variants.reduce((sum, variant) => sum + variant.inventory, 0),
    weight: variants[0].weight,
  };
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
  const variantsProvided = body.variants !== undefined;
  const variants = variantsProvided ? parseVariants(body.variants) : null;
  const basePrice = numberValue(body.price);
  const baseOriginalPrice = body.originalPrice == null || body.originalPrice === '' ? null : numberValue(body.originalPrice);
  const baseStock = numberValue(body.stock ?? 0);
  const baseWeight = typeof body.weight === 'string' || typeof body.weight === 'number' ? String(body.weight).trim() : '150g';
  const productDefaults = productVariantDefaults(variants, { price: basePrice, originalPrice: baseOriginalPrice, stock: baseStock, weight: baseWeight });
  const price = productDefaults.price;
  const originalPrice = productDefaults.originalPrice;
  const weightInput = productDefaults.weight;
  const weightMatch = weightInput.match(/^(\d+)\s*(?:g|gram)?$/i);
  const weight = weightMatch ? Number(weightMatch[1]) : null;
  const protein = typeof body.protein === 'string' ? body.protein.trim().replace(/\s+protein$/i, '') : '';
  const category = normalizeCategory(body.category);
  const description = typeof body.description === 'string' ? body.description.trim() : typeof body.desc === 'string' ? body.desc.trim() : '';
  const ingredients = body.ingredients == null ? null : typeof body.ingredients === 'string' ? body.ingredients.trim() || null : undefined;
  const image = normalizeImage(body.imageUrl ?? body.image);
  const badge = normalizeBadge(body.badge);
  const nutritionFacts = body.nutritionFacts == null ? null : normalizeNutritionFacts(body.nutritionFacts);
  const stock = productDefaults.stock;

  if (!name || name.length > 160 || price === null || price <= 0 || (originalPrice !== null && (originalPrice < price || originalPrice < 0))
    || weight === null || weight <= 0 || (!protein && category !== 'Gia vị Tây Bắc') || protein.length > 80 || !category || description.length > 2000 || ingredients === undefined || (ingredients?.length ?? 0) > 5000
    || !image || stock === null || stock < 0 || stock > 1000000 || (variantsProvided && !variants) || variants?.some((variant) => variant.id)
    || (body.badge != null && (typeof body.badge !== 'string' || body.badge.trim().length > 60)) || (body.nutritionFacts != null && nutritionFacts === null)) {
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
        ingredients,
        image,
        highlight: typeof body.highlight === 'string' && body.highlight.trim() ? body.highlight.trim().slice(0, 40) : 'Sản phẩm mới',
        badge,
        nutritionFacts: nutritionFacts ?? Prisma.DbNull,
        active: true,
        ...(variants?.length ? { variants: { create: variants.map(variantFields) } } : {}),
      } satisfies Prisma.ProductCreateInput,
      ...(variants?.length ? { include: { variants: true } } : {}),
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
  const variantsProvided = body.variants !== undefined;
  const variants = variantsProvided ? parseVariants(body.variants) : null;
  const basePrice = numberValue(body.price);
  const baseOriginalPrice = body.originalPrice == null || body.originalPrice === '' ? null : numberValue(body.originalPrice);
  const baseStock = numberValue(body.stock ?? 0);
  const baseWeight = typeof body.weight === 'string' || typeof body.weight === 'number' ? String(body.weight).trim() : '150g';
  const productDefaults = productVariantDefaults(variants, { price: basePrice, originalPrice: baseOriginalPrice, stock: baseStock, weight: baseWeight });
  const price = productDefaults.price;
  const originalPrice = productDefaults.originalPrice;
  const weightInput = productDefaults.weight;
  const weightMatch = weightInput.match(/^(\d+)\s*(?:g|gram)?$/i);
  const weight = weightMatch ? Number(weightMatch[1]) : null;
  const protein = typeof body.protein === 'string' ? body.protein.trim().replace(/\s+protein$/i, '') : '';
  const category = normalizeCategory(body.category);
  const description = typeof body.description === 'string' ? body.description.trim() : typeof body.desc === 'string' ? body.desc.trim() : '';
  const ingredients = body.ingredients === undefined ? undefined : body.ingredients == null ? null : typeof body.ingredients === 'string' ? body.ingredients.trim() || null : null;
  const image = normalizeImage(body.imageUrl ?? body.image);
  const badge = normalizeBadge(body.badge);
  const nutritionFacts = body.nutritionFacts == null ? null : normalizeNutritionFacts(body.nutritionFacts);
  const stock = productDefaults.stock;

  if (!name || name.length > 160 || price === null || price <= 0 || (originalPrice !== null && (originalPrice < price || originalPrice < 0))
    || weight === null || weight <= 0 || (!protein && category !== 'Gia vị Tây Bắc') || protein.length > 80 || !category || description.length > 2000 || (body.ingredients != null && typeof body.ingredients !== 'string') || (ingredients?.length ?? 0) > 5000
    || !image || stock === null || stock < 0 || stock > 1000000 || (variantsProvided && !variants)
    || (body.badge != null && (typeof body.badge !== 'string' || body.badge.trim().length > 60)) || (body.nutritionFacts != null && nutritionFacts === null)) {
    return NextResponse.json({ error: { message: 'Vui lòng kiểm tra tên, danh mục, giá, khối lượng, tồn kho và mô tả sản phẩm.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const previous = await prisma.product.findUnique({ where: { id: productId }, select: { price: true, stock: true, active: true, variants: { select: { id: true } } } });
    if (!previous) return NextResponse.json({ error: { message: 'Không tìm thấy sản phẩm.' } }, { status: 404 });
    if (variantsProvided && variants?.some((variant) => variant.id && !previous.variants.some((current) => current.id === variant.id))) {
      return NextResponse.json({ error: { message: 'Phân loại không thuộc sản phẩm này.' } }, { status: 400 });
    }
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
        ...(ingredients !== undefined ? { ingredients } : {}),
        image,
        images: [image],
        badge,
        nutritionFacts: nutritionFacts ?? Prisma.DbNull,
        ...(variantsProvided ? { variants: syncVariants(variants ?? []) } : {}),
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
