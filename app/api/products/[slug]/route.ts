import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  return withDatabase(async () => {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { variants: true, reviews: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });

  if (!product || !product.active) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      ...product,
      status: product.stock < 30 ? 'Sắp hết' : 'Còn hàng',
      variants: product.variants.map((variant) => ({
        ...variant,
        label: variant.title,
        stock: variant.inventory,
        status: variant.inventory < 30 ? 'Sắp hết' : 'Còn hàng',
      })),
    },
    variants: product.variants.map((variant) => ({ ...variant, label: variant.title, stock: variant.inventory })),
    reviews: product.reviews,
  });
  });
}
