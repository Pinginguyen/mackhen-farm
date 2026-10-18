import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { normalizeNutritionFacts } from '@/lib/store-data';
import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { DELETE as deleteProduct, PATCH as updateProduct, POST as createProduct } from '@/app/api/products/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const items = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ items: items.map((product) => ({
      ...product,
      nutritionFacts: normalizeNutritionFacts(product.nutritionFacts),
    })) });
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