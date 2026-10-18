import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { normalizeNutritionFacts } from '@/lib/store-data';
import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { DELETE as deleteProduct, PATCH as updateProduct, POST as createProduct } from '@/app/api/products/route';

export const dynamic = 'force-dynamic';

function fallbackProducts() {
  return DEFAULT_PRODUCTS.map((product) => ({ ...product, active: true, variants: [], nutritionFacts: null }));
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    try {
      const items = await prisma.product.findMany({
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ items: items.length ? items.map((product) => ({
        ...product,
        nutritionFacts: normalizeNutritionFacts(product.nutritionFacts),
      })) : fallbackProducts() });
    } catch (error) {
      console.warn('Admin product query failed; displaying fallback catalog.', error instanceof Error ? error.name : 'UnknownError');
      return NextResponse.json({ items: fallbackProducts() });
    }
  }, 'Admin product listing failed');
}

export async function POST(request: Request) {
  return createProduct(request);
}

export async function PATCH(request: Request) {
  return updateProduct(request);
}

export async function DELETE(request: Request) {
  return deleteProduct(request);
}