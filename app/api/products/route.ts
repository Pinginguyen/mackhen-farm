import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

export function GET() {
  return withDatabase(async () => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  });
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
